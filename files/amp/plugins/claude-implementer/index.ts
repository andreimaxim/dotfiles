import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { PluginAPI, Subscription, ThreadID } from '@ampcode/plugin'
import type { Query, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk@0.3.285'

export const description =
	'Relays an agreed Amp plan and follow-up messages to local Claude Code through the Agent SDK, using Opus 5.5/high in the same checkout. Not for orbs.'

const workerInstructions = [
	'You are implementing an agreed plan from an Amp thread in this working directory.',
	'Follow local guidance, preserve unrelated existing changes, and implement and test the supplied plan.',
	'Amp only relays messages between you and the user. Your final reply is delivered unchanged.',
	'If you need a decision, clarification, access, or permission, explain it in ordinary prose and end your turn. The user will reply in this same session.',
	'Do not bypass denied permissions. Do not commit, push, deploy, or change shared data unless the handoff explicitly authorizes it.',
].join(' ')

type Update =
	| { type: 'tool'; name: string }
	| { type: 'tool_progress'; name: string; elapsed_seconds: number }
	| { type: 'summary'; text: string }
	| { type: 'started'; model: string }

type Run = {
	sessionID: string
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
		name: 'claude_implement',
		title: 'Send to Claude Code',
		description:
			'Send an agreed plan or the user’s verbatim follow-up to local Claude Code on Opus 5.5/high. Returns a session ID immediately; use claude_implement_wait until the turn ends. Relay Claude’s reply unchanged and wait for the user. Do not interpret it, resolve blockers, automatically continue, or edit concurrently.',
		inputSchema: {
			type: 'object',
			properties: {
				instructions: {
					type: 'string',
					description:
						'For a new session: the agreed plan, constraints, relevant files and existing changes, acceptance criteria, and verification commands. For a resumed session: the user’s message, unchanged.',
				},
				session_id: {
					type: 'string',
					description:
						'Exact session UUID returned by the earlier call. Required for follow-ups, including after plugin reload. Omit only to start a new conversation.',
				},
				allowed_tools: {
					type: 'array',
					items: { type: 'string' },
					description:
						'Additional Claude permission rules for already-authorized work, such as Bash(bin/rails test *). Use scoped rules, not unrestricted Bash. File edits are already allowed.',
				},
			},
			required: ['instructions'],
			additionalProperties: false,
		},
		async execute(input, ctx) {
			if (disposed) throw new Error('The Claude relay has been unloaded.')
			if (typeof input.instructions !== 'string' || !input.instructions.trim()) {
				throw new Error('A message for Claude is required.')
			}
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
			if (active) {
				throw new Error(
					`Claude Code session ${active.sessionID} is still running in ${cwd}. Do not start another writer.`,
				)
			}

			const instructions = input.instructions
			const sessionID = input.session_id ?? randomUUID()
			const resume = input.session_id !== undefined
			const run: Run = {
				sessionID,
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
					if (run.abort.signal.aborted) return
					stream = query({
						prompt: instructions,
						options: {
							cwd,
							model: 'claude-opus-5-5',
							effort: 'high',
							pathToClaudeCodeExecutable: 'claude',
							permissionMode: 'acceptEdits',
							allowedTools,
							settingSources: ['user', 'project', 'local'],
							systemPrompt: { type: 'preset', preset: 'claude_code', append: workerInstructions },
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
		name: 'claude_implement_wait',
		title: 'Wait for Claude Code',
		description:
			'Wait up to 30 seconds for the submitted Claude turn, or request cancellation. Returns progress and the unchanged SDK result. While state is running, keep waiting and report progress. Once it ends, relay result.result verbatim; do not resolve questions, blockers, or permissions, and do not automatically send another message.',
		inputSchema: {
			type: 'object',
			properties: {
				session_id: { type: 'string', description: 'The session ID returned by claude_implement.' },
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
					'No matching turn in this Amp thread. After reload, use claude_implement with the saved session_id and the user’s next message.',
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

	await amp.registerSkill({ path: 'skills/implementing' })
}
