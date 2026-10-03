import { execFile, spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { PluginAPI, Subscription, ThreadID } from '@ampcode/plugin'
import type { Query, SDKResultMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk@0.3.285'
import systemPrompt from './system-prompt.ts'

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

type Run = {
	threadID: ThreadID
	abort: AbortController
	summaries: string[]
	result?: SDKResultMessage
	error?: string
	stderr: string
	closed: Promise<void>
}

export default async function (amp: PluginAPI) {
	if (!amp.system.workspaceRoot) return
	const cwd = amp.helpers.filePathFromURI(amp.system.workspaceRoot)
	let active: Run | undefined
	let disposed = false

	const formatReply = (run: Run) => {
		const sections: string[] = []
		if (run.result?.subtype === 'success' && !run.result.is_error) {
			sections.push(`## Claude Code reply\n\n${run.result.result}`)
		}
		if (run.summaries.length) {
			sections.push(`## Claude Code work summaries\n\n${run.summaries.join('\n\n')}`)
		}
		const diagnostics: string[] = []
		if (run.abort.signal.aborted) diagnostics.push('Claude Code was cancelled. Completed edits remain.')
		else if (run.error || !run.result || run.result.is_error || run.result.subtype !== 'success') {
			diagnostics.push('Claude Code failed.')
		}
		if (run.error) diagnostics.push(run.error)
		if (run.result?.subtype === 'success' && run.result.is_error) {
			if (run.result.result) diagnostics.push(run.result.result)
			else {
				if (run.result.api_error_status != null) diagnostics.push(`API status: ${run.result.api_error_status}`)
				if (run.result.terminal_reason) diagnostics.push(`SDK stopped: ${run.result.terminal_reason}`)
			}
		} else if (run.result && run.result.subtype !== 'success') {
			diagnostics.push(`SDK stopped: ${run.result.subtype}`, ...run.result.errors)
		}
		if (diagnostics.length) sections.push(`## Relay diagnostics\n\n${diagnostics.join('\n\n')}`)
		if (run.result?.permission_denials.length) {
			sections.push(
				`## Permission denials\n\n${run.result.permission_denials
					.map((denial) => `${denial.tool_name}\n\n${JSON.stringify(denial.tool_input, null, 2)}`)
					.join('\n\n')}`,
			)
		}
		if (run.stderr) sections.push(`## Claude Code stderr\n\n${run.stderr}`)
		return sections.join('\n\n')
	}

	amp.onDispose(async () => {
		disposed = true
		const run = active
		run?.abort.abort()
		await run?.closed
	})

	amp.registerCommand('stop', { title: 'Stop Claude Code', category: 'claudie' }, async (ctx) => {
		const run = active
		if (!run || run.threadID !== ctx.thread?.id) {
			await ctx.ui.notify('No Claude Code turn is running in this Amp thread.')
			return
		}
		run.abort.abort()
		await run.closed
	})

	for (const mode of ['implement', 'consult'] as const) amp.registerTool({
		name: `claude_${mode}`,
		title: mode === 'implement' ? 'Claude Code implementation' : 'Claude consultation',
		transcriptGroup: mode === 'implement'
			? { active: 'Implementing with Claude Code…', complete: 'Claude has finished implementing' }
			: { active: 'Consulting with Claude…', complete: 'Claude has finished consulting' },
		description:
			(mode === 'implement'
				? 'Delegate an implementation task to Claude Code on Opus 5.5/high.'
				: 'Consult Claude Code as a read-only external oracle on Fable 5.1/high.') +
			' Runs in the current checkout and waits silently until the stream ends and the process exits. Returns the original reply, work summaries, and diagnostics. Do not edit concurrently or retry failed or cancelled work automatically. The user can cancel with claudie: Stop Claude Code.',
		inputSchema: {
			type: 'object',
			properties: {
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
				resume: {
					type: 'boolean',
					description:
						'Continue the latest task sent through this tool in the same Amp thread and checkout, including after reload. Set true only for an authorized continuation; omit or set false for a new task.',
				},
				allowed_tools: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Implementation only: additional Claude permission rules for already-authorized work, such as Bash(bin/rails test *). Use scoped rules, not unrestricted Bash. File edits are already allowed. Not accepted for consultations.',
				},
			},
			required: ['instructions'],
			additionalProperties: false,
		},
		async execute(input, ctx) {
			if (disposed) throw new Error('The Claude relay has been unloaded.')
			if (typeof input.instructions !== 'string') {
				throw new Error('A message for Claude is required.')
			}
			const images = imageSources(input.instructions, input.images)
			if (!input.instructions.trim() && !images.length) throw new Error('A message or image for Claude is required.')
			if (input.resume !== undefined && typeof input.resume !== 'boolean') {
				throw new Error('resume must be a boolean.')
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
					`Claude Code is still running in ${cwd}. Wait before starting another turn.`,
				)
			}

			const instructions = input.instructions
			const run: Run = {
				threadID: ctx.thread.id,
				abort: new AbortController(),
				summaries: [],
				stderr: '',
				closed: Promise.resolve(),
			}
			active = run

			run.closed = (async () => {
				let stream: Query | undefined
				let subscription: Subscription | undefined
				let childClosed = Promise.resolve()
				try {
					subscription = ctx.thread.state.subscribe((state) => {
						if (state === 'idle' || state === 'error') run.abort.abort()
					})
					const directory = join(process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state'), 'amp', 'claudie')
					const key = createHash('sha256').update(JSON.stringify([cwd, ctx.thread.id, mode])).digest('hex')
					const sessionPath = join(directory, `${key}.session`)
					let sessionID = randomUUID()
					if (input.resume) {
						try {
							sessionID = await readFile(sessionPath, 'utf8')
						} catch (error) {
							if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
							throw new Error('No saved Claude task in this Amp thread, checkout, and mode. Start a new task with a self-contained brief.')
						}
						if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionID)) {
							throw new Error('The saved Claude session is invalid. Start a new task with a self-contained brief.')
						}
					} else {
						await rm(sessionPath, { force: true })
					}
					// Amp runs plugins in Bun, which caches this pinned npm dependency on first use.
					const { query } = await import('@anthropic-ai/claude-agent-sdk@0.3.285')
					const prompt = await imagePrompt(instructions, images, cwd, run.abort.signal)
					if (run.abort.signal.aborted) return
					if (!input.resume) {
						await mkdir(directory, { recursive: true, mode: 0o700 })
						const temporary = `${sessionPath}.${sessionID}.tmp`
						try {
							await writeFile(temporary, sessionID, { mode: 0o600 })
							await rename(temporary, sessionPath)
						} finally {
							await rm(temporary, { force: true })
						}
					}
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
								tools: ['Read', 'Glob', 'Grep', 'Bash', 'Skill'],
								skills: 'all',
								disallowedTools: ['mcp__*'],
								strictMcpConfig: true,
								planModeInstructions: 'Answer the supplied question as an external oracle. Do not create a plan file or request a transition to implementation.',
								canUseTool: async () => ({ behavior: 'deny', message: 'This consultation is read-only. Report the missing evidence or access in your reply.' }),
							} : { permissionMode: 'acceptEdits', allowedTools }),
							settingSources: ['user', 'project', 'local'],
							systemPrompt: `${systemPrompt}\n\n${relayInstructions}\n\n${roleInstructions[mode]}`,
							abortController: run.abort,
							...(input.resume ? { resume: sessionID } : { sessionId: sessionID }),
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
						if (message.type === 'tool_use_summary') {
							run.summaries.push(message.summary)
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
					active = undefined
				}
			})()
			await run.closed
			return formatReply(run)
		},
	})

	await amp.registerSkill({ path: 'skills/handing-off-to-claude' })
}
