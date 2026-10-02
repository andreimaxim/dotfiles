import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { PluginAPI, Subscription, ThreadID } from '@ampcode/plugin'
import type { Query, SDKResultMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk@0.3.285'

export const description =
	'Relays implementation to Opus 5.5/high or consults Claude Code as a read-only external oracle on Fable 5.1/high. Supports follow-ups and images in the same checkout. Not for orbs.'

const execFileAsync = promisify(execFile)

function imageSources(instructions: string, images: unknown): string[] {
	if (
		images !== undefined &&
		(!Array.isArray(images) || images.some((image) => typeof image !== 'string' || !image.trim()))
	) {
		throw new Error('images must be an array of nonempty local paths or Amp attachment URLs.')
	}
	const attached = [...instructions.matchAll(/<attached_image\b[^>]*\bpath=(["'])(.*?)\1[^>]*>/g)]
		.map((match) => match[2])
	return [...new Set([...attached, ...((images ?? []) as string[])])]
}

async function imagePrompt(instructions: string, sources: string[], cwd: string, signal: AbortSignal) {
	if (!sources.length) return instructions
	const content: Exclude<SDKUserMessage['message']['content'], string> = []
	let directory: string | undefined
	try {
		for (const [index, source] of sources.entries()) {
			signal.throwIfAborted()
			let path: string
			if (/^https?:\/\//i.test(source)) {
				directory ??= await mkdtemp(join(tmpdir(), 'amp-claude-images-'))
				path = join(directory, String(index))
				await execFileAsync('amp', ['files', 'get', source, '-o', path], { cwd, signal })
			} else {
				path = source.startsWith('file:')
					? fileURLToPath(source)
					: source.startsWith('~/') ? join(homedir(), source.slice(2)) : resolve(cwd, source)
			}
			const bytes = await readFile(path, { signal })
			const mediaType = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
				? 'image/png'
				: bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))
					? 'image/jpeg'
					: /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))
						? 'image/gif'
						: bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
							? 'image/webp'
							: undefined
			if (!mediaType) throw new Error(`Unsupported image ${source}: use PNG, JPEG, GIF, or WebP.`)
			content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: bytes.toString('base64') } })
		}
	} finally {
		if (directory) await rm(directory, { recursive: true, force: true })
	}
	if (instructions) content.push({ type: 'text', text: instructions })
	return (async function* (): AsyncGenerator<SDKUserMessage> {
		yield { type: 'user', message: { role: 'user', content }, parent_tool_use_id: null }
	})()
}

const relayInstructions = [
	'Amp has delegated one bounded task to you.',
	'If you need a decision, clarification, access, or permission to finish this task, state the question or blocker and end your turn. Amp may answer from settled user decisions in its conversation; otherwise it will ask the user. Answers return in this same session.',
	'When the task is complete or the consultation is answered, report the result and stop. Amp handles subsequent conversation by default.',
	'Do not bypass denied permissions. Do not commit, push, deploy, or change shared data unless the handoff explicitly authorizes it.',
].join(' ')

const roleInstructions = {
	implement: [
		'You are implementing an agreed plan from an Amp thread in this working directory.',
		'Follow local guidance, preserve unrelated existing changes, and implement and test the supplied plan.',
	].join(' '),
	consult: [
		'You are an external oracle: a read-only engineering advisor consulted from Amp.',
		'Investigate the supplied question in this checkout. Follow repository guidance, seek contradictory evidence, and distinguish facts from assumptions.',
		'For a review, compare the original requirements and constraints with the actual implementation. Inspect the relevant staged and unstaged diff, newly added files, surrounding code, and tests yourself.',
		'Use shell commands only for inspection. Do not edit files, run tests or formatters, install dependencies, delegate, or mutate local or external state. Report missing evidence instead of producing it through writes.',
		'Return evidence-backed findings with file locations and failing scenarios, or a recommendation with its tradeoffs. State when no material issues were found and identify verification limitations. Do not implement your recommendations.',
	].join(' '),
}

type Update =
	| { type: 'tool'; name: string }
	| { type: 'tool_progress'; name: string; elapsed_seconds: number }
	| { type: 'summary'; text: string }
	| { type: 'started'; model: string }

type Run = {
	sessionID: string
	mode: 'implement' | 'consult'
	state: 'running' | 'replied' | 'failed' | 'cancelled'
	startedAt: number
	abort: AbortController
	updates: Update[]
	result?: SDKResultMessage
	error?: string
	stderr: string
	closed: Promise<void>
}

export default async function (amp: PluginAPI) {
	if (!amp.system.workspaceRoot) return
	const cwd = amp.helpers.filePathFromURI(amp.system.workspaceRoot)
	// Retain the latest submitted turn per Amp thread; Claude persists the conversation.
	const runs = new Map<ThreadID, Run>()
	let active: Run | undefined
	let disposed = false

	const snapshot = (run: Run, cursor = 0) =>
		JSON.stringify({
			session_id: run.sessionID,
			mode: run.mode,
			cwd,
			state: run.state,
			elapsed_seconds: Math.floor((Date.now() - run.startedAt) / 1000),
			cancel_requested: run.abort.signal.aborted,
			cursor: run.updates.length,
			updates: run.updates.slice(cursor),
			result: run.result,
			error: run.error,
			stderr: run.stderr || undefined,
		})

	amp.onDispose(async () => {
		disposed = true
		const run = active
		run?.abort.abort()
		await run?.closed
	})

	amp.registerTool({
		name: 'claude_send',
		title: 'Send to Claude Code',
		description:
			'Submit a task to Claude Code in the current checkout. Returns a session ID immediately; save it and use claude_wait until the turn ends. Do not edit concurrently or retry a failed or cancelled submission automatically.',
		inputSchema: {
			type: 'object',
			properties: {
				mode: {
					type: 'string',
					enum: ['implement', 'consult'],
					description: 'implement uses Opus 5.5/high; consult uses Claude Code as a read-only external oracle on Fable 5.1/high. Keep the same mode on follow-ups. Start a new session when changing modes.',
				},
				instructions: {
					type: 'string',
					description:
						'Self-contained task brief or follow-up message for Claude. Preserve user replies and attached_image tags unchanged; for Amp-supplied clarifications, include the answer and supporting conversation context. May be empty for an image-only message.',
				},
				images: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Image attachments as exact Amp attachment URLs or local paths (relative to the workspace or absolute). PNG, JPEG, GIF, and WebP are sent as image bytes, not links. Images in attached_image tags are included automatically; duplicate paths are sent once.',
				},
				session_id: {
					type: 'string',
					description:
						'Exact saved session UUID for an authorized continuation of the same delegated task, including after plugin reload. Omit for a new task.',
				},
				allowed_tools: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Implementation only: additional Claude permission rules for already-authorized work, such as Bash(bin/rails test *). Use scoped rules, not unrestricted Bash. File edits are already allowed. Not accepted for consultations.',
				},
			},
			required: ['mode', 'instructions'],
			additionalProperties: false,
		},
		async execute(input, ctx) {
			if (disposed) throw new Error('The Claude relay has been unloaded.')
			const mode = input.mode
			if (mode !== 'implement' && mode !== 'consult') throw new Error('mode must be implement or consult.')
			if (typeof input.instructions !== 'string') {
				throw new Error('A message for Claude is required.')
			}
			const images = imageSources(input.instructions, input.images)
			if (!input.instructions.trim() && !images.length) throw new Error('A message or image for Claude is required.')
			if (
				input.session_id !== undefined &&
				(typeof input.session_id !== 'string' ||
					!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.session_id))
			) {
				throw new Error('session_id must be a Claude Code session UUID.')
			}
			const allowedTools = input.allowed_tools ?? []
			if (
				!Array.isArray(allowedTools) ||
				allowedTools.some((rule) => typeof rule !== 'string' || !rule.trim())
			) {
				throw new Error('allowed_tools must be an array of nonempty permission rules.')
			}
			if (mode === 'consult' && allowedTools.length) throw new Error('Consultations do not accept allowed_tools.')
			if (active) {
				throw new Error(
					`Claude Code session ${active.sessionID} is still running in ${cwd}. Wait before starting another turn.`,
				)
			}

			const instructions = input.instructions
			const sessionID = input.session_id ?? randomUUID()
			const resume = input.session_id !== undefined
			const run: Run = {
				sessionID,
				mode,
				state: 'running',
				startedAt: Date.now(),
				abort: new AbortController(),
				updates: [],
				stderr: '',
				closed: Promise.resolve(),
			}
			active = run
			runs.set(ctx.thread.id, run)

			run.closed = (async () => {
				let stream: Query | undefined
				let subscription: Subscription | undefined
				let childClosed = Promise.resolve()
				try {
					subscription = ctx.thread.state.subscribe((state) => {
						if (state === 'idle' || state === 'error') run.abort.abort()
					})
					// Amp runs plugins in Bun, which caches this pinned npm dependency on first use.
					const { query } = await import('@anthropic-ai/claude-agent-sdk@0.3.285')
					const prompt = await imagePrompt(instructions, images, cwd, run.abort.signal)
					if (run.abort.signal.aborted) return
					stream = query({
						prompt,
						options: {
							cwd,
							model: mode === 'consult' ? 'claude-fable-5-1' : 'claude-opus-5-5',
							effort: 'high',
							pathToClaudeCodeExecutable: 'claude',
							...(mode === 'consult' ? {
								permissionMode: 'plan',
								tools: ['Read', 'Glob', 'Grep', 'Bash'],
								disallowedTools: ['mcp__*'],
								strictMcpConfig: true,
								planModeInstructions: 'Answer the supplied question as an external oracle. Do not create a plan file or request a transition to implementation.',
								canUseTool: async () => ({ behavior: 'deny', message: 'This consultation is read-only. Report the missing evidence or access in your reply.' }),
							} : { permissionMode: 'acceptEdits', allowedTools }),
							settingSources: ['user', 'project', 'local'],
							systemPrompt: { type: 'preset', preset: 'claude_code', append: `${relayInstructions}\n\n${roleInstructions[mode]}` },
							abortController: run.abort,
							...(resume ? { resume: sessionID } : { sessionId: sessionID }),
							spawnClaudeCodeProcess: (options) => {
								const child = spawn(options.command, options.args, {
									cwd: options.cwd,
									env: options.env,
									signal: options.signal,
									stdio: 'pipe',
									windowsHide: true,
								})
								childClosed = new Promise<void>((resolve) => child.once('close', () => resolve()))
								child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
									run.stderr = (run.stderr + chunk).slice(-16000)
								})
								return child
							},
						},
					})

					for await (const message of stream) {
						if (message.type === 'system' && message.subtype === 'init') {
							run.updates.push({ type: 'started', model: message.model })
						} else if (message.type === 'assistant') {
							for (const block of message.message.content) {
								if (block.type === 'tool_use') run.updates.push({ type: 'tool', name: block.name })
							}
						} else if (message.type === 'tool_progress') {
							run.updates.push({
								type: 'tool_progress',
								name: message.tool_name,
								elapsed_seconds: message.elapsed_time_seconds,
							})
						} else if (message.type === 'tool_use_summary') {
							run.updates.push({ type: 'summary', text: message.summary })
						} else if (message.type === 'result') {
							if (message.session_id !== sessionID)
								throw new Error('Claude returned a different session ID.')
							run.result = message
						}
					}
					if (!run.result) throw new Error('Claude ended without a result message.')
				} catch (error) {
					run.error = error instanceof Error ? error.message : String(error)
				} finally {
					stream?.close()
					// The SDK's bounded cleanup can finish before the CLI process exits.
					await childClosed
					subscription?.unsubscribe()
					run.state = run.abort.signal.aborted
						? 'cancelled'
						: run.error || !run.result || run.result.is_error || run.result.subtype !== 'success'
							? 'failed'
							: 'replied'
					active = undefined
				}
			})()
			return snapshot(run)
		},
	})

	amp.registerTool({
		name: 'claude_wait',
		title: 'Wait for Claude Code',
		description:
			'Wait for the submitted Claude turn, or request cancellation. Returns progress and the unchanged SDK result. While state is running, keep waiting and report progress.',
		inputSchema: {
			type: 'object',
			properties: {
				session_id: { type: 'string', description: 'The session ID returned by claude_send.' },
				cursor: {
					type: 'integer',
					minimum: 0,
					description: 'The cursor from the previous response; omit to replay all updates.',
				},
				timeout_ms: {
					type: 'integer',
					minimum: 0,
					maximum: 60000,
					description: 'Wait duration, default 30000. Use 0 for an immediate status check.',
				},
				cancel: {
					type: 'boolean',
					description: 'Request cancellation only when the user asks to stop. Does not undo edits.',
				},
			},
			required: ['session_id'],
			additionalProperties: false,
		},
		async execute(input, ctx) {
			const run = runs.get(ctx.thread.id)
			if (!run || input.session_id !== run.sessionID) {
				throw new Error(
					'No matching turn in this Amp thread. To resume an authorized continuation after reload, use claude_send with the saved session_id and mode.',
				)
			}
			const cursor = input.cursor ?? 0
			const timeout = input.timeout_ms ?? 30000
			if (
				typeof cursor !== 'number' ||
				!Number.isInteger(cursor) ||
				cursor < 0 ||
				cursor > run.updates.length
			) {
				throw new Error('cursor must refer to an update in this turn.')
			}
			if (
				typeof timeout !== 'number' ||
				!Number.isInteger(timeout) ||
				timeout < 0 ||
				timeout > 60000
			) {
				throw new Error('timeout_ms must be an integer from 0 to 60000.')
			}
			if (input.cancel !== undefined && typeof input.cancel !== 'boolean') {
				throw new Error('cancel must be a boolean.')
			}
			if (input.cancel && run.state === 'running') run.abort.abort()
			if (run.state === 'running' && timeout > 0) {
				let timer: ReturnType<typeof setTimeout> | undefined
				try {
					await Promise.race([
						run.closed,
						new Promise<void>((resolve) => {
							timer = setTimeout(resolve, timeout)
						}),
					])
				} finally {
					clearTimeout(timer)
				}
			}
			return snapshot(run, cursor)
		},
	})

	await amp.registerSkill({ path: 'skills/handing-off-to-claude' })
}
