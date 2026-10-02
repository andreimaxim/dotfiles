import assert from 'node:assert/strict'
import { once } from 'node:events'
import { registerHooks } from 'node:module'
import { after, afterEach, beforeEach, test } from 'node:test'
import { setImmediate as tick } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { PluginAPI, PluginToolContext, PluginToolDefinition } from '@ampcode/plugin'
import type { Options } from '@anthropic-ai/claude-agent-sdk@0.3.285'
import load from './index.ts'

// Keep the SDK boundary controlled: these tests install nothing and never start Claude.
const sdkModule = `data:text/javascript,${encodeURIComponent(`export { fakeQuery as query } from ${JSON.stringify(import.meta.url)}`)}`
const loader = registerHooks({
	resolve(specifier, context, next) {
		return specifier === '@anthropic-ai/claude-agent-sdk@0.3.285'
			? { url: sdkModule, shortCircuit: true }
			: next(specifier, context)
	},
})
after(() => loader.deregister())

type Call = {
	prompt: string
	options: Options
	emit: (message: object) => void
	finish: () => void
	fail: (error: Error) => void
	cleanup?: Promise<void>
	closeCalled: boolean
}

const cwd = '/checkout with spaces'
let calls: Call[]
let startupError: Error | undefined
let cleanups: Array<() => Promise<void>>

beforeEach(() => {
	calls = []
	startupError = undefined
	cleanups = []
})

afterEach(async () => {
	for (const cleanup of cleanups) await cleanup()
})

export function fakeQuery({ prompt, options }: { prompt: string; options: Options }) {
	const queue: object[] = []
	let wake = () => {}
	let finished = false
	let failure: Error | undefined
	const call: Call = {
		prompt,
		options,
		closeCalled: false,
		emit(message) {
			queue.push(message)
			wake()
		},
		finish() {
			finished = true
			wake()
		},
		fail(error) {
			failure = error
			wake()
		},
	}
	calls.push(call)
	if (startupError) throw startupError
	const abort = () => call.fail(new Error('SDK query aborted'))
	options.abortController!.signal.addEventListener('abort', abort, { once: true })
	const stream = (async function* () {
		try {
			while (true) {
				if (queue.length) yield queue.shift()
				else if (failure) throw failure
				else if (finished) return
				else
					await new Promise<void>((resolve) => {
						wake = resolve
					})
			}
		} finally {
			await call.cleanup
			options.abortController!.signal.removeEventListener('abort', abort)
		}
	})()
	return Object.assign(stream, {
		close() {
			call.closeCalled = true
			call.finish()
		},
	})
}

async function harness(workspace: string | null = cwd, initialState = 'running') {
	const tools = new Map<string, PluginToolDefinition>()
	const skills: string[] = []
	const listeners = new Map<string, Set<(state: string) => void>>()
	let dispose = async () => {}
	await load({
		system: { workspaceRoot: workspace ? pathToFileURL(workspace) : null },
		helpers: { filePathFromURI: (uri: URL) => fileURLToPath(uri) },
		onDispose: (callback: () => Promise<void>) => {
			dispose = callback
		},
		registerTool: (tool: PluginToolDefinition) => {
			tools.set(tool.name, tool)
		},
		registerSkill: async ({ path }: { path: string }) => {
			skills.push(path)
		},
	} as unknown as PluginAPI)
	cleanups.push(() => dispose())
	return {
		tools,
		skills,
		listeners,
		dispose: () => dispose(),
		async call(name: string, input: Record<string, unknown>, thread = 'T-owner') {
			if (name === 'claude_send') input = { mode: 'implement', ...input }
			const ctx = {
				thread: {
					id: thread,
					state: {
						subscribe(listener: (state: string) => void) {
							const subscriptions = listeners.get(thread) ?? new Set()
							listeners.set(thread, subscriptions)
							subscriptions.add(listener)
							listener(initialState)
							return { unsubscribe: () => subscriptions.delete(listener) }
						},
					},
				},
			} as unknown as PluginToolContext
			return JSON.parse((await tools.get(name)!.execute(input, ctx)) as string)
		},
	}
}

async function callAt(index = 0) {
	for (let i = 0; i < 100; i++) {
		if (calls[index]) return calls[index]
		await tick()
	}
	throw new Error('The relay did not invoke the SDK.')
}

function reply(call: Call, text = 'Implemented and tested.', overrides: object = {}) {
	return {
		type: 'result',
		subtype: 'success',
		is_error: false,
		session_id: call.options.resume ?? call.options.sessionId,
		result: text,
		permission_denials: [],
		...overrides,
	}
}

test('registers tools and skill without loading the SDK; requires a workspace', async () => {
	const enabled = await harness()
	assert.deepEqual([...enabled.tools.keys()], ['claude_send', 'claude_wait'])
	assert.deepEqual(enabled.tools.get('claude_send')!.inputSchema.required, ['mode', 'instructions'])
	assert.deepEqual(enabled.skills, ['skills/handing-off-to-claude'])
	const disabled = await harness(null)
	assert.equal(disabled.tools.size, 0)
	assert.deepEqual(disabled.skills, [])
	assert.equal(calls.length, 0)
})

test('starts promptly with the literal handoff, existing CLI/settings, and Opus 5.5/high', async () => {
	const relay = await harness()
	const instructions = '  Keep $HOME and `quotes` literal.\n$(touch injected); "do not expand"\n'
	const start = await relay.call('claude_send', {
		mode: 'implement',
		instructions,
		allowed_tools: ['Bash(bin/rails test *)', 'Bash(git diff *)'],
	})
	assert.equal(start.state, 'running')
	assert.equal(start.cwd, cwd)
	assert.match(start.session_id, /^[0-9a-f-]{36}$/)
	const call = await callAt()
	assert.equal(call.prompt, instructions)
	assert.equal(call.options.cwd, cwd)
	assert.equal(call.options.model, 'claude-opus-5-5')
	assert.equal(call.options.effort, 'high')
	assert.equal(call.options.pathToClaudeCodeExecutable, 'claude')
	assert.equal(call.options.permissionMode, 'acceptEdits')
	assert.deepEqual(call.options.settingSources, ['user', 'project', 'local'])
	assert.deepEqual(call.options.allowedTools, ['Bash(bin/rails test *)', 'Bash(git diff *)'])
	assert.equal(call.options.sessionId, start.session_id)
	assert.equal(call.options.resume, undefined)
	assert.equal(call.options.continue, undefined)
	assert.equal(call.options.canUseTool, undefined)
	assert.equal(call.options.allowDangerouslySkipPermissions, undefined)
	assert.equal(call.closeCalled, false)
})

test('exposes replayable progress before the reply and consumes trailing SDK messages', async () => {
	const relay = await harness()
	const start = await relay.call('claude_send', { instructions: 'plan' })
	const call = await callAt()
	call.emit({ type: 'system', subtype: 'init', model: 'claude-opus-5-5' })
	call.emit({
		type: 'assistant',
		message: {
			content: [
				{ type: 'thinking', thinking: 'private reasoning' },
				{ type: 'tool_use', name: 'Read', input: { secret: 'do not expose inputs' } },
			],
		},
	})
	await tick()
	const first = await relay.call('claude_wait', {
		session_id: start.session_id,
		timeout_ms: 0,
	})
	assert.equal(first.state, 'running')
	assert.deepEqual(first.updates, [
		{ type: 'started', model: 'claude-opus-5-5' },
		{ type: 'tool', name: 'Read' },
	])
	assert.equal(first.cursor, 2)
	call.emit({ type: 'tool_progress', tool_name: 'Bash', elapsed_time_seconds: 37 })
	call.emit(reply(call, 'Which trade-off do you prefer?'))
	await tick()
	const pending = await relay.call('claude_wait', {
		session_id: start.session_id,
		cursor: first.cursor,
		timeout_ms: 0,
	})
	assert.equal(pending.state, 'running')
	assert.deepEqual(pending.updates, [{ type: 'tool_progress', name: 'Bash', elapsed_seconds: 37 }])
	await assert.rejects(
		relay.call('claude_send', { instructions: 'too early' }),
		/still running/,
	)
	call.emit({ type: 'tool_use_summary', summary: 'Read the model; no files changed.' })
	call.finish()
	const end = await relay.call('claude_wait', {
		session_id: start.session_id,
		cursor: pending.cursor,
	})
	assert.equal(end.state, 'replied')
	assert.equal(end.result.result, 'Which trade-off do you prefer?')
	assert.deepEqual(end.updates, [{ type: 'summary', text: 'Read the model; no files changed.' }])
	const replay = await relay.call('claude_wait', {
		session_id: start.session_id,
		cursor: first.cursor,
	})
	assert.deepEqual(replay.updates, [...pending.updates, ...end.updates])
	assert.equal(call.closeCalled, true)
	assert.equal(relay.listeners.get('T-owner')!.size, 0)
})

test('bounds the wait without ending the Claude turn', async (t) => {
	const relay = await harness()
	const start = await relay.call('claude_send', { instructions: 'plan' })
	const call = await callAt()
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let returned = false
	const waiting = relay
		.call('claude_wait', { session_id: start.session_id })
		.then((value) => {
			returned = true
			return value
		})
	t.mock.timers.tick(29999)
	await Promise.resolve()
	assert.equal(returned, false)
	t.mock.timers.tick(1)
	assert.equal((await waiting).state, 'running')
	assert.equal(call.options.abortController!.signal.aborted, false)
	assert.equal(call.closeCalled, false)
})

test('passes questions, blockers, reports and denials unchanged without taking another turn', async () => {
	const relay = await harness()
	for (const text of [
		'  Which approach?\n\n- A: fast, but more storage.\n- B: slower, less storage.\n',
		'I cannot access Jira. Please configure access in Claude Code.',
		'Implemented the change.\n\nTests: 12 passed; deployment not performed.',
	]) {
		const index = calls.length
		const start = await relay.call('claude_send', { instructions: 'agreed plan' })
		const call = await callAt(index)
		const result = reply(call, text, {
			permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'bin/rails test' } }],
		})
		call.emit(result)
		call.finish()
		const end = await relay.call('claude_wait', { session_id: start.session_id })
		assert.equal(end.state, 'replied')
		assert.deepEqual(end.result, result)
		await tick()
		assert.equal(calls.length, index + 1)
	}
})

test('resumes the exact session with the user’s unchanged message, including after reload', async () => {
	const relay = await harness()
	const first = await relay.call('claude_send', { instructions: 'initial plan' })
	const call = await callAt()
	call.emit(reply(call, 'Do you prefer A or B?'))
	call.finish()
	await relay.call('claude_wait', { session_id: first.session_id })
	await relay.dispose()
	const reloaded = await harness()
	await assert.rejects(
		reloaded.call('claude_wait', { session_id: first.session_id }),
		/No matching turn/,
	)
	const instructions = ' B, please.\nKeep the existing interface. '
	const second = await reloaded.call('claude_send', {
		instructions,
		session_id: first.session_id,
	})
	const resumed = await callAt(1)
	assert.equal(second.session_id, first.session_id)
	assert.equal(resumed.prompt, instructions)
	assert.equal(resumed.options.resume, first.session_id)
	assert.equal(resumed.options.sessionId, undefined)
	assert.equal(resumed.options.continue, undefined)
	assert.equal(second.cursor, 0)
})

test('retains SDK failure details, including an error result followed by an exception', async () => {
	const relay = await harness()
	for (const scenario of ['missing-result', 'wrong-session', 'model-error', 'transport-error']) {
		const index = calls.length
		const start = await relay.call('claude_send', { instructions: scenario })
		const call = await callAt(index)
		if (scenario === 'wrong-session')
			call.emit(reply(call, 'wrong', { session_id: '00000000-0000-0000-0000-000000000000' }))
		if (scenario === 'model-error') call.emit(reply(call, 'Model unavailable', { is_error: true }))
		if (scenario === 'transport-error') {
			call.emit({
				type: 'result',
				subtype: 'error_during_execution',
				is_error: true,
				session_id: start.session_id,
				errors: ['MCP connection failed'],
				permission_denials: [],
			})
			call.fail(new Error('CLI exited with code 7'))
		} else call.finish()
		const end = await relay.call('claude_wait', { session_id: start.session_id })
		assert.equal(end.state, 'failed')
		if (scenario === 'missing-result') assert.match(end.error, /without a result/)
		if (scenario === 'wrong-session') assert.match(end.error, /different session/)
		if (scenario === 'model-error') assert.equal(end.result.result, 'Model unavailable')
		if (scenario === 'transport-error') {
			assert.deepEqual(end.result.errors, ['MCP connection failed'])
			assert.match(end.error, /CLI exited with code 7/)
		}
		assert.equal(call.closeCalled, true)
		assert.equal(relay.listeners.get('T-owner')!.size, 0)
	}
})

test('reports startup errors and releases the writer for a user-requested retry', async () => {
	const relay = await harness()
	startupError = new Error('spawn claude ENOENT')
	const start = await relay.call('claude_send', { instructions: 'plan' })
	const failed = await relay.call('claude_wait', { session_id: start.session_id })
	assert.equal(failed.state, 'failed')
	assert.match(failed.error, /spawn claude ENOENT/)
	startupError = undefined
	const retry = await relay.call('claude_send', {
		instructions: 'try again',
		session_id: start.session_id,
	})
	assert.equal(retry.state, 'running')
	const call = await callAt(1)
	assert.equal(call.options.resume, start.session_id)
})

test('rejects invalid submissions and polling arguments before their side effects', async () => {
	const relay = await harness()
	for (const input of [
		{ instructions: 'plan', mode: undefined },
		{ instructions: 'plan', mode: 'review' },
		{ instructions: 'plan', mode: null },
		{ instructions: 'review', mode: 'consult', allowed_tools: ['Bash'] },
		{ instructions: ' ' },
		{ instructions: 'plan', session_id: '--continue' },
		{ instructions: 'plan', allowed_tools: 'Bash' },
		{ instructions: 'plan', allowed_tools: [''] },
	])
		await assert.rejects(relay.call('claude_send', input))
	assert.equal(calls.length, 0)
	const start = await relay.call('claude_send', { instructions: 'plan' })
	const call = await callAt()
	for (const input of [
		{ cursor: -1 },
		{ cursor: 1 },
		{ cursor: 0.5 },
		{ cursor: '0' },
		{ timeout_ms: -1 },
		{ timeout_ms: 60001 },
		{ timeout_ms: 1.5 },
		{ timeout_ms: '0' },
		{ cancel: 'yes' },
	])
		await assert.rejects(
			relay.call('claude_wait', { session_id: start.session_id, ...input }),
		)
	assert.equal(call.options.abortController!.signal.aborted, false)
	assert.equal(calls.length, 1)
})

test('isolates thread results and prevents concurrent writers until SDK cleanup finishes', async () => {
	const relay = await harness()
	const start = await relay.call('claude_send', { instructions: 'plan' })
	const call = await callAt()
	await assert.rejects(
		relay.call('claude_send', { instructions: 'another writer' }, 'T-other'),
		/still running/,
	)
	await assert.rejects(
		relay.call('claude_wait', { session_id: start.session_id, cancel: true }, 'T-other'),
		/No matching turn/,
	)
	const cleanup = Promise.withResolvers<void>()
	call.cleanup = cleanup.promise
	const stopped = relay.call('claude_wait', {
		session_id: start.session_id,
		cancel: true,
	})
	await tick()
	assert.equal(call.options.abortController!.signal.aborted, true)
	await assert.rejects(
		relay.call('claude_send', { instructions: 'too early' }),
		/still running/,
	)
	cleanup.resolve()
	assert.equal((await stopped).state, 'cancelled')
	assert.equal(call.closeCalled, true)
	const second = await relay.call('claude_send', { instructions: 'new plan' }, 'T-other')
	assert.equal(second.state, 'running')
	const previous = await relay.call('claude_wait', { session_id: start.session_id })
	assert.equal(previous.state, 'cancelled')
})

test('keeps the writer until the process closes, preserving spawn inputs, stderr and cancellation', async () => {
	for (const cancel of [false, true]) {
		const relay = await harness()
		const index = calls.length
		const start = await relay.call('claude_send', { instructions: 'plan' })
		const call = await callAt(index)
		const forwardedAbort = new AbortController()
		const literal = 'value with spaces, $HOME and `quotes`'
		const child = call.options.spawnClaudeCodeProcess!({
			command: process.execPath,
			args: [
				'-e',
				`
				process.stderr.write('Diagnostic from child\\n')
				console.log(JSON.stringify({ cwd: process.cwd(), marker: process.env.RELAY_MARKER, argument: process.argv[1] }))
				process.stdin.resume()
			`,
				literal,
			],
			cwd: process.cwd(),
			env: { RELAY_MARKER: literal },
			signal: forwardedAbort.signal,
		})
		const childErrors: Error[] = []
		child.on('error', (error) => childErrors.push(error))
		try {
			const [output] = await once(child.stdout, 'data')
			assert.deepEqual(JSON.parse(output.toString()), {
				cwd: process.cwd(),
				marker: literal,
				argument: literal,
			})
			if (cancel) {
				await relay.call('claude_wait', {
					session_id: start.session_id,
					cancel: true,
					timeout_ms: 0,
				})
			} else {
				call.emit(reply(call))
				call.finish()
			}
			await tick()
			assert.equal(call.closeCalled, true)
			const pending = await relay.call('claude_wait', {
				session_id: start.session_id,
				timeout_ms: 0,
			})
			assert.equal(pending.state, 'running')
			assert.equal(child.exitCode, null)
			await assert.rejects(
				relay.call('claude_send', { instructions: 'too early' }),
				/still running/,
			)
			if (cancel) forwardedAbort.abort()
		} finally {
			child.stdin.end()
		}
		const end = await relay.call('claude_wait', { session_id: start.session_id })
		assert.equal(end.state, cancel ? 'cancelled' : 'replied')
		assert.equal(end.stderr, 'Diagnostic from child\n')
		assert.deepEqual(
			childErrors.map((error) => error.name),
			cancel ? ['AbortError'] : [],
		)
		assert.equal(relay.listeners.get('T-owner')!.size, 0)
	}
})

test('stops on owner idle/error and on unload, but not on another thread’s state', async () => {
	for (const stop of ['idle', 'error', 'unload']) {
		const relay = await harness()
		const index = calls.length
		const start = await relay.call('claude_send', { instructions: 'plan' })
		const call = await callAt(index)
		assert.equal(relay.listeners.has('T-other'), false)
		if (stop === 'unload') await relay.dispose()
		else for (const listener of relay.listeners.get('T-owner')!) listener(stop)
		const end = await relay.call('claude_wait', { session_id: start.session_id })
		assert.equal(end.state, 'cancelled')
		assert.equal(call.options.abortController!.signal.aborted, true)
		assert.equal(call.closeCalled, true)
		assert.equal(relay.listeners.get('T-owner')!.size, 0)
		if (stop === 'unload')
			await assert.rejects(
				relay.call('claude_send', { instructions: 'late call' }),
				/unloaded/,
			)
	}
})

test('does not start Claude if the parent already stopped while the SDK was loading', async () => {
	const relay = await harness(cwd, 'idle')
	const start = await relay.call('claude_send', { instructions: 'plan' })
	const end = await relay.call('claude_wait', { session_id: start.session_id })
	assert.equal(end.state, 'cancelled')
	assert.equal(calls.length, 0)
	assert.equal(relay.listeners.get('T-owner')!.size, 0)
})
