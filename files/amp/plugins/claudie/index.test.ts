import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, afterEach, beforeEach, test } from 'node:test'
import { setImmediate as tick, setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { PluginAPI, PluginCommandContext, PluginToolContext, PluginToolDefinition } from '@ampcode/plugin'
import type { Options } from '@anthropic-ai/claude-agent-sdk@0.3.285'

// Exercise either entrypoint without installing the SDK or starting Claude.
const installed = !!process.env.CLAUDE_RELAY_UNDER_TEST
const { default: load } = await import(process.env.CLAUDE_RELAY_UNDER_TEST || './index.ts')
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
let directory: string
let oldHome: string | undefined
let oldState: string | undefined

beforeEach(async () => {
	calls = []
	startupError = undefined
	cleanups = []
	directory = await mkdtemp(join(tmpdir(), 'claudie lifecycle tests '))
	oldHome = process.env.HOME
	oldState = process.env.XDG_STATE_HOME
	process.env.HOME = directory
	process.env.XDG_STATE_HOME = join(directory, 'state')
	await mkdir(join(directory, '.claude'))
	await writeFile(join(directory, '.claude', 'SYSTEM.md'), 'Test system prompt.')
})

afterEach(async () => {
	for (const cleanup of cleanups) await cleanup()
	if (oldHome === undefined) delete process.env.HOME
	else process.env.HOME = oldHome
	if (oldState === undefined) delete process.env.XDG_STATE_HOME
	else process.env.XDG_STATE_HOME = oldState
	await rm(directory, { recursive: true, force: true })
})

export function fakeQuery({ prompt, options }: { prompt: string; options: Options }) {
	const queue: object[] = []
	let wake = () => {}
	let finished = false
	let failure: Error | undefined
	const call: Call = {
		prompt, options, closeCalled: false,
		emit(message) { queue.push(message); wake() },
		finish() { finished = true; wake() },
		fail(error) { failure = error; wake() },
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
				else await new Promise<void>((resolve) => { wake = resolve })
			}
		} finally {
			await call.cleanup
			options.abortController!.signal.removeEventListener('abort', abort)
		}
	})()
	return Object.assign(stream, {
		close() { call.closeCalled = true; call.finish() },
	})
}

async function harness(workspace: string | null = cwd, initialState = 'running') {
	const tools = new Map<string, PluginToolDefinition>()
	const commands = new Map<string, (ctx: PluginCommandContext) => Promise<void>>()
	const skills: string[] = []
	const notifications: string[] = []
	const listeners = new Map<string, Set<(state: string) => void>>()
	let dispose = async () => {}
	await load({
		system: { workspaceRoot: workspace ? pathToFileURL(workspace) : null },
		helpers: { filePathFromURI: (uri: URL) => fileURLToPath(uri) },
		onDispose: (callback: () => Promise<void>) => { dispose = callback },
		registerTool: (tool: PluginToolDefinition) => { tools.set(tool.name, tool) },
		registerCommand: (name: string, _options: unknown, callback: (ctx: PluginCommandContext) => Promise<void>) => {
			commands.set(name, callback)
		},
		registerSkill: async ({ path }: { path: string }) => { skills.push(path) },
	} as unknown as PluginAPI)
	cleanups.push(() => dispose())
	return {
		tools, commands, skills, listeners, notifications,
		dispose: () => dispose(),
		async stop(thread = 'T-owner') {
			await commands.get('stop')!({
				thread: { id: thread }, ui: { notify: async (message: string) => { notifications.push(message) } },
			} as unknown as PluginCommandContext)
		},
		async call(input: Record<string, unknown>, thread = 'T-owner', tool = 'claude_implement') {
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
			return await tools.get(tool)!.execute(input, ctx) as string
		},
	}
}

async function callAt(index = 0) {
	for (let i = 0; i < 200; i++) {
		if (calls[index]) return calls[index]
		await delay(5)
	}
	throw new Error('The relay did not invoke the SDK.')
}

function reply(call: Call, text = 'Implemented and tested.', overrides: object = {}) {
	return {
		type: 'result', subtype: 'success', is_error: false,
		session_id: call.options.resume ?? call.options.sessionId,
		result: text, permission_denials: [], ...overrides,
	}
}

test('registers one blocking tool per flow, model-specific labels, and no session-ID input', async () => {
	const relay = await harness()
	assert.deepEqual([...relay.tools.keys()], ['claude_implement', 'claude_consult'])
	assert.deepEqual(relay.tools.get('claude_implement')!.transcriptGroup,
		{ active: 'Opus is implementing', complete: 'Opus has replied' })
	assert.deepEqual(relay.tools.get('claude_consult')!.transcriptGroup,
		{ active: 'Consulting Fable', complete: 'Fable has spoken' })
	for (const tool of relay.tools.values()) {
		assert.deepEqual(tool.inputSchema.required, ['instructions'])
		assert.equal(tool.inputSchema.properties!.session_id, undefined)
		assert.equal(tool.inputSchema.properties!.mode, undefined)
	}
	assert.deepEqual([...relay.commands.keys()], ['stop'])
	assert.deepEqual(relay.skills, ['skills/handing-off-to-claude'])
	const disabled = await harness(null)
	assert.equal(disabled.tools.size, 0)
	assert.equal(disabled.commands.size, 0)
	assert.equal(calls.length, 0)
})

test('keeps the literal handoff and implementation settings, returning the reply without a UUID', async () => {
	const relay = await harness()
	const instructions = '  Keep $HOME and `quotes` literal.\n$(touch injected); "do not expand"\n'
	const pending = relay.call({ instructions, ...(installed ? {} : { allowed_tools: ['Bash(bin/rails test *)'] }) })
	const call = await callAt()
	assert.equal(call.prompt, instructions)
	assert.equal(call.options.cwd, cwd)
	assert.equal(call.options.model, 'claude-opus-5-5')
	assert.equal(call.options.effort, 'high')
	assert.equal(call.options.pathToClaudeCodeExecutable, 'claude')
	assert.equal(call.options.permissionMode, installed ? 'bypassPermissions' : 'acceptEdits')
	assert.equal(call.options.allowDangerouslySkipPermissions, installed ? true : undefined)
	assert.deepEqual(call.options.allowedTools, installed ? undefined : ['Bash(bin/rails test *)'])
	assert.deepEqual(call.options.settingSources, ['user', 'project', 'local'])
	if (installed) assert.match(call.options.systemPrompt as string, /^Test system prompt\./)
	else assert.equal((call.options.systemPrompt as { preset: string }).preset, 'claude_code')
	assert.match(call.options.sessionId!, /^[0-9a-f-]{36}$/)
	assert.equal(call.options.resume, undefined)
	assert.equal(call.options.continue, undefined)
	call.emit(reply(call))
	call.finish()
	const output = await pending
	assert.equal(output, '## Claude Code reply\n\nImplemented and tested.')
	assert.ok(!output.includes(call.options.sessionId!))
})

test('waits past the result message for trailing summaries and SDK cleanup', async () => {
	const relay = await harness()
	let returned = false
	const pending = relay.call({ instructions: 'plan' }).then((output) => { returned = true; return output })
	const call = await callAt()
	call.emit({ type: 'assistant', message: { content: [
		{ type: 'thinking', thinking: 'private reasoning' },
		{ type: 'tool_use', name: 'Read', input: { secret: 'private input' } },
	] } })
	call.emit(reply(call, 'Which trade-off do you prefer?'))
	await tick()
	assert.equal(returned, false)
	const cleanup = Promise.withResolvers<void>()
	call.cleanup = cleanup.promise
	call.emit({ type: 'tool_use_summary', summary: 'Read the model; no files changed.' })
	call.finish()
	await tick()
	assert.equal(returned, false)
	await assert.rejects(relay.call({ instructions: 'too early' }), /still running/)
	cleanup.resolve()
	assert.equal(await pending, '## Claude Code reply\n\nWhich trade-off do you prefer?\n\n## Claude Code work summaries\n\nRead the model; no files changed.')
	assert.equal(call.closeCalled, true)
	assert.equal(relay.listeners.get('T-owner')!.size, 0)
})

test('does not time out into a polling snapshot', async (t) => {
	const relay = await harness()
	let returned = false
	const pending = relay.call({ instructions: 'plan' }).then((output) => { returned = true; return output })
	const call = await callAt()
	t.mock.timers.enable({ apis: ['setTimeout'] })
	t.mock.timers.tick(600_000)
	await tick()
	assert.equal(returned, false)
	assert.equal(call.options.abortController!.signal.aborted, false)
	call.emit(reply(call))
	call.finish()
	await pending
})

test('preserves questions, blockers, reports and denials without automatically taking another turn', async () => {
	const relay = await harness()
	for (const text of ['  Which approach?\n\n- A: fast, more storage.\n- B: slower, less storage.\n',
		'I cannot access Jira.', 'Implemented.\n\nTests: 12 passed; deployment not performed.']) {
		const index = calls.length
		const pending = relay.call({ instructions: 'agreed plan' })
		const call = await callAt(index)
		call.emit(reply(call, text, { permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'bin/rails test' } }] }))
		call.finish()
		assert.equal(await pending, `## Claude Code reply\n\n${text}\n\n## Permission denials\n\nBash\n\n{\n  "command": "bin/rails test"\n}`)
		await tick()
		assert.equal(calls.length, index + 1)
	}
})

test('persists private session state across reload and resumes only when explicitly requested', async () => {
	const relay = await harness()
	const first = relay.call({ instructions: 'initial plan' })
	const call = await callAt()
	call.emit(reply(call, 'A or B?')); call.finish(); await first
	const state = join(directory, 'state', 'amp', 'claudie')
	const files = await readdir(state)
	assert.equal(files.length, 1)
	assert.equal(await readFile(join(state, files[0]), 'utf8'), call.options.sessionId)
	assert.equal((await stat(join(state, files[0]))).mode & 0o777, 0o600)
	await relay.dispose()
	const reloaded = await harness()
	const instructions = ' B, please.\nKeep the existing interface. '
	const second = reloaded.call({ instructions, resume: true })
	const resumed = await callAt(1)
	assert.equal(resumed.prompt, instructions)
	assert.equal(resumed.options.resume, call.options.sessionId)
	assert.equal(resumed.options.sessionId, undefined)
	resumed.emit(reply(resumed)); resumed.finish(); await second
	for (const input of [{ instructions: 'new task' }, { instructions: 'another task', resume: false }]) {
		const index = calls.length
		const next = reloaded.call(input)
		const fresh = await callAt(index)
		assert.equal(fresh.options.resume, undefined)
		assert.notEqual(fresh.options.sessionId, calls[index - 1].options.sessionId)
		assert.notEqual(fresh.options.sessionId, call.options.sessionId)
		fresh.emit(reply(fresh)); fresh.finish(); await next
	}
})

test('isolates saved sessions by thread, checkout, and implementation versus consultation', async () => {
	const relay = await harness()
	const first = relay.call({ instructions: 'initial plan' })
	const worker = await callAt()
	worker.emit(reply(worker)); worker.finish(); await first
	const otherCheckout = await harness('/different checkout')
	for (const pending of [
		relay.call({ instructions: 'continue', resume: true }, 'T-other'),
		otherCheckout.call({ instructions: 'continue', resume: true }),
	]) assert.match(await pending, /No saved Claude task/)
	assert.match(await relay.call({ instructions: 'continue', resume: true }, 'T-owner', 'claude_consult'), /No saved Claude task/)
	assert.equal(calls.length, 1)
	const consultation = relay.call({ instructions: 'independent review' }, 'T-owner', 'claude_consult')
	const advisor = await callAt(1)
	assert.equal(advisor.options.model, 'claude-fable-5-1')
	assert.notEqual(advisor.options.sessionId, worker.options.sessionId)
	advisor.emit(reply(advisor)); advisor.finish(); await consultation
	const continuation = relay.call({ instructions: 'continue implementation', resume: true })
	const resumed = await callAt(2)
	assert.equal(resumed.options.resume, worker.options.sessionId)
	resumed.emit(reply(resumed)); resumed.finish(); await continuation
})

test('rejects corrupt saved sessions rather than resuming or silently starting a different task', async () => {
	const relay = await harness()
	const first = relay.call({ instructions: 'plan' })
	const call = await callAt()
	call.emit(reply(call)); call.finish(); await first
	const state = join(directory, 'state', 'amp', 'claudie')
	const [file] = await readdir(state)
	await writeFile(join(state, file), 'broken state')
	assert.match(await relay.call({ instructions: 'continue', resume: true }), /saved Claude session is invalid/)
	assert.equal(calls.length, 1)
})

test('retains SDK failure details, including an error result followed by an exception', async () => {
	const relay = await harness()
	for (const [scenario, expected] of [
		['missing-result', /without a result/],
		['wrong-session', /different session/],
		['model-error', /Model unavailable/],
		['transport-error', /MCP connection failed/],
	] as const) {
		const index = calls.length
		const pending = relay.call({ instructions: scenario })
		const call = await callAt(index)
		if (scenario === 'wrong-session') call.emit(reply(call, 'wrong', { session_id: '00000000-0000-0000-0000-000000000000' }))
		if (scenario === 'model-error') call.emit(reply(call, 'Model unavailable', { is_error: true }))
		if (scenario === 'transport-error') {
			call.emit({ type: 'result', subtype: 'error_during_execution', is_error: true,
				session_id: call.options.sessionId, errors: ['MCP connection failed'], permission_denials: [] })
			call.fail(new Error('CLI exited with code 7'))
		} else call.finish()
		const output = await pending
		assert.match(output, /Claude Code failed/)
		assert.match(output, expected)
		if (scenario === 'transport-error') {
			assert.match(output, /CLI exited with code 7/)
		}
		assert.equal(call.closeCalled, true)
		assert.equal(relay.listeners.get('T-owner')!.size, 0)
	}
})

test('reports startup errors and releases the writer for an explicit retry', async () => {
	const relay = await harness()
	startupError = new Error('spawn claude ENOENT')
	assert.match(await relay.call({ instructions: 'plan' }), /spawn claude ENOENT/)
	const sessionID = calls[0].options.sessionId
	startupError = undefined
	const pending = relay.call({ instructions: 'try again', resume: true })
	const call = await callAt(1)
	assert.equal(call.options.resume, sessionID)
	call.emit(reply(call)); call.finish(); await pending
})

test('rejects invalid submissions before side effects', async () => {
	const relay = await harness()
	for (const input of [{ instructions: ' ' }, { instructions: null }, { instructions: 'plan', resume: 'true' },
		{ instructions: 'plan', resume: null }]) await assert.rejects(relay.call(input))
	if (!installed) {
		for (const allowed_tools of ['Bash', ['']]) await assert.rejects(relay.call({ instructions: 'plan', allowed_tools }))
		await assert.rejects(relay.call({ instructions: 'review', allowed_tools: ['Bash'] }, 'T-owner', 'claude_consult'))
	}
	assert.equal(calls.length, 0)
})

test('only the owning thread can cancel, and writers stay excluded until SDK cleanup', async () => {
	const relay = await harness()
	const pending = relay.call({ instructions: 'plan' })
	const call = await callAt()
	await assert.rejects(relay.call({ instructions: 'another writer' }, 'T-other'), /still running/)
	await relay.stop('T-other')
	assert.equal(call.options.abortController!.signal.aborted, false)
	assert.equal(relay.notifications.length, 1)
	const cleanup = Promise.withResolvers<void>()
	call.cleanup = cleanup.promise
	const stopped = relay.stop()
	await tick()
	assert.equal(call.options.abortController!.signal.aborted, true)
	await assert.rejects(relay.call({ instructions: 'too early' }), /still running/)
	cleanup.resolve()
	await stopped
	assert.match(await pending, /cancelled/)
	const next = relay.call({ instructions: 'new plan' }, 'T-other')
	const other = await callAt(1)
	other.emit(reply(other)); other.finish(); await next
})

test('waits for process exit on success and cancellation, preserving spawn inputs and stderr', async () => {
	for (const cancel of [false, true]) {
		const relay = await harness()
		let returned = false
		const index = calls.length
		const pending = relay.call({ instructions: 'plan' }).then((output) => { returned = true; return output })
		const call = await callAt(index)
		const forwardedAbort = new AbortController()
		const literal = 'value with spaces, $HOME and `quotes`'
		const child = call.options.spawnClaudeCodeProcess!({
			command: process.execPath,
			args: ['-e', `process.stderr.write('Diagnostic from child\\n');
				console.log(JSON.stringify({ cwd: process.cwd(), marker: process.env.RELAY_MARKER, argument: process.argv[1] }));
				process.stdin.resume()`, literal],
			cwd: process.cwd(), env: { RELAY_MARKER: literal }, signal: forwardedAbort.signal,
		})
		const childErrors: Error[] = []
		child.on('error', (error) => childErrors.push(error))
		let stopped: Promise<void> | undefined
		try {
			const [output] = await once(child.stdout, 'data')
			assert.deepEqual(JSON.parse(output.toString()), { cwd: process.cwd(), marker: literal, argument: literal })
			if (cancel) stopped = relay.stop()
			else { call.emit(reply(call)); call.finish() }
			await tick()
			assert.equal(returned, false)
			assert.equal(call.closeCalled, true)
			assert.equal(child.exitCode, null)
			await assert.rejects(relay.call({ instructions: 'too early' }), /still running/)
			if (cancel) forwardedAbort.abort()
		} finally { child.stdin.end() }
		const output = await pending
		await stopped
		assert.match(output, cancel ? /cancelled/ : /Implemented and tested/)
		assert.match(output, /Diagnostic from child\n/)
		assert.deepEqual(childErrors.map((error) => error.name), cancel ? ['AbortError'] : [])
		assert.equal(relay.listeners.get('T-owner')!.size, 0)
	}
})

test('stops on owner idle/error and unload without cancelling another thread', async () => {
	for (const stop of ['idle', 'error', 'unload']) {
		const relay = await harness()
		const index = calls.length
		const pending = relay.call({ instructions: 'plan' })
		const call = await callAt(index)
		assert.equal(relay.listeners.has('T-other'), false)
		if (stop === 'unload') await relay.dispose()
		else for (const listener of relay.listeners.get('T-owner')!) listener(stop)
		assert.match(await pending, /cancelled/)
		assert.equal(call.closeCalled, true)
		assert.equal(relay.listeners.get('T-owner')!.size, 0)
		if (stop === 'unload') await assert.rejects(relay.call({ instructions: 'late call' }), /unloaded/)
	}
})

test('does not start Claude when the parent is already stopped', async () => {
	const relay = await harness(cwd, 'idle')
	assert.match(await relay.call({ instructions: 'plan' }), /cancelled/)
	assert.equal(calls.length, 0)
	assert.equal(relay.listeners.get('T-owner')!.size, 0)
})
