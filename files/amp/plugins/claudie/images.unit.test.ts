import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, afterEach, beforeEach, test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { PluginAPI, PluginCommandContext, PluginToolContext, PluginToolDefinition } from '@ampcode/plugin'
import type { Options, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk@0.3.285'

// Unit tests: real relay and filesystem, fake Amp host, SDK, and attachment downloader.
// These inspect arguments and bytes; they do not verify Claude's image handling or permissions.
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

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA3sAAAAASUVORK5CYII=', 'base64')
const attachment = 'https://ampcode.com/user-content/attachments/test-image.png'
type Call = { prompt: string | AsyncIterable<SDKUserMessage>; options: Options; messages: SDKUserMessage[] }
let calls: Call[]
let directory: string
let oldPath: string | undefined
let oldHome: string | undefined
let oldState: string | undefined
let dispose: () => Promise<void>

beforeEach(async () => {
	calls = []
	dispose = async () => {}
	directory = await mkdtemp(join(tmpdir(), 'claude image tests '))
	oldPath = process.env.PATH
	oldHome = process.env.HOME
	oldState = process.env.XDG_STATE_HOME
	process.env.PATH = `${directory}:${oldPath}`
	process.env.HOME = directory
	process.env.XDG_STATE_HOME = join(directory, 'state')
	await mkdir(join(directory, '.claude'))
	await writeFile(join(directory, '.claude', 'SYSTEM.md'), 'Test system prompt.')
	await writeFile(join(directory, 'local photo.png'), png)
})

afterEach(async () => {
	await dispose()
	if (oldPath === undefined) delete process.env.PATH
	else process.env.PATH = oldPath
	if (oldHome === undefined) delete process.env.HOME
	else process.env.HOME = oldHome
	if (oldState === undefined) delete process.env.XDG_STATE_HOME
	else process.env.XDG_STATE_HOME = oldState
	await rm(directory, { recursive: true, force: true })
})

export function fakeQuery({ prompt, options }: Omit<Call, 'messages'>) {
	const call: Call = { prompt, options, messages: [] }
	calls.push(call)
	const stream = (async function* () {
		if (typeof prompt !== 'string') {
			for await (const message of prompt) call.messages.push(message)
		}
		yield {
			type: 'result', subtype: 'success', is_error: false,
			session_id: options.resume ?? options.sessionId,
			result: 'Stub SDK reply.', permission_denials: [],
		}
	})()
	return Object.assign(stream, { close() {} })
}

async function harness() {
	const tools = new Map<string, PluginToolDefinition>()
	let stop: (ctx: PluginCommandContext) => Promise<void>
	await load({
		system: { workspaceRoot: pathToFileURL(directory) },
		helpers: { filePathFromURI: fileURLToPath },
		onDispose: (callback: () => Promise<void>) => { dispose = callback },
		registerTool: (tool: PluginToolDefinition) => { tools.set(tool.name, tool) },
		registerCommand: (_name: string, _options: unknown, callback: typeof stop) => { stop = callback },
		registerSkill: async () => {},
	} as unknown as PluginAPI)
	const ctx = {
		thread: { id: 'T-test', state: { subscribe: () => ({ unsubscribe() {} }) } },
		ui: { notify: async () => {} },
	} as unknown as PluginToolContext
	const call = async (name: string, input: Record<string, unknown>) =>
		await tools.get(name)!.execute(input, ctx) as string
	return {
		tools,
		call,
		stop: () => stop(ctx as unknown as PluginCommandContext),
		async submit(input: Record<string, unknown>) {
			const { mode = 'implement', ...message } = input
			return await call(`claude_${mode}`, message)
		},
	}
}

async function fakeAmp(mode = 'success') {
	await writeFile(join(directory, 'amp'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.writeFileSync('download.json', JSON.stringify(args));
if (${JSON.stringify(mode)} === 'failure') {
  console.error('attachment denied'); process.exit(1);
} else if (${JSON.stringify(mode)} === 'pending') {
  process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1000);
} else {
  fs.writeFileSync(args[4], Buffer.from(${JSON.stringify(png.toString('base64'))}, 'base64'));
}
`, { mode: 0o700 })
}

function imageBlock(data: Buffer, mediaType = 'image/png') {
	return { type: 'image', source: { type: 'base64', media_type: mediaType, data: data.toString('base64') } }
}

test('passes distinct model and permission options to the SDK for each flow', async () => {
	const relay = await harness()
	await relay.submit({ mode: 'implement', instructions: 'Implement the agreed change.' })
	const worker = calls[0].options
	assert.equal(worker.model, 'claude-opus-5-5')
	assert.equal(worker.effort, 'high')
	assert.equal(worker.tools, undefined)
	assert.equal(worker.strictMcpConfig, undefined)
	assert.equal(worker.canUseTool, undefined)
	assert.notEqual(worker.permissionMode, 'plan')

	const instructions = 'Review the change against the original requirements; do not fix it.'
	await relay.submit({ mode: 'consult', instructions })
	assert.equal(calls[1].prompt, instructions)
	const advisor = calls[1].options
	assert.notEqual(advisor.sessionId, worker.sessionId)
	assert.equal(advisor.resume, undefined)
	assert.equal(advisor.model, 'claude-fable-5-1')
	assert.equal(advisor.effort, 'high')
	assert.equal(advisor.permissionMode, 'plan')
	assert.notEqual(advisor.allowDangerouslySkipPermissions, true)
	assert.deepEqual(advisor.tools, ['Read', 'Glob', 'Grep', 'Bash'])
	assert.deepEqual(advisor.disallowedTools, ['mcp__*'])
	assert.equal(advisor.strictMcpConfig, true)
	assert.equal(advisor.allowedTools, undefined)
	const decision = await advisor.canUseTool!('Bash', { command: 'touch should-not-exist' }, {
		signal: new AbortController().signal, toolUseID: 'permission-test',
	})
	assert.equal(decision.behavior, 'deny')
})

test('passes the saved consultation ID and unchanged image follow-up to the SDK after reload', async () => {
	const relay = await harness()
	await relay.submit({ mode: 'consult', instructions: 'Give a second opinion on options A and B.' })
	const sessionID = calls[0].options.sessionId
	await dispose()
	const reloaded = await harness()
	const instructions = '  Does this screenshot change your recommendation?\n'
	await reloaded.submit({
		mode: 'consult', resume: true, instructions, images: ['local photo.png'],
	})
	assert.equal(calls[1].options.resume, sessionID)
	assert.equal(calls[1].options.sessionId, undefined)
	assert.equal(calls[1].options.model, 'claude-fable-5-1')
	assert.equal(calls[1].options.effort, 'high')
	assert.equal(calls[1].options.permissionMode, 'plan')
	assert.deepEqual(calls[1].messages[0].message.content, [imageBlock(png), { type: 'text', text: instructions }])
})

test('text-only prompts remain literal strings, including empty image lists', async () => {
	const relay = await harness()
	const instructions = '  Literal $HOME and `quotes`\r\nKeep trailing spaces.  '
	await relay.submit({ instructions, images: [] })
	assert.equal(calls.length, 1)
	assert.equal(calls[0].prompt, instructions)
})

test('builds SDK image blocks and preserves literal text for new and resumed submissions', async () => {
	const relay = await harness()
	const instructions = '  Describe this photograph.\n'
	const output = await relay.submit({ instructions, images: ['local photo.png'] })
	const sessionID = calls[0].options.sessionId
	assert.deepEqual(calls[0].messages, [{
		type: 'user', parent_tool_use_id: null,
		message: { role: 'user', content: [imageBlock(png), { type: 'text', text: instructions }] },
	}])
	assert.ok(!output.includes(png.toString('base64')))

	const followUp = `<attached_image path="${join(directory, 'local photo.png')}">Original caption.</attached_image>`
	await relay.submit({ instructions: followUp, resume: true })
	assert.equal(calls[1].options.resume, sessionID)
	assert.equal(calls[1].options.sessionId, undefined)
	assert.deepEqual(calls[1].messages[0].message.content, [imageBlock(png), { type: 'text', text: followUp }])
})

test('resolves image paths and selects MIME types from file headers rather than filenames', async () => {
	const jpeg = Buffer.from('ffd8ffe000104a464946000101', 'hex')
	const gif = Buffer.from('GIF89a')
	const webp = Buffer.from('524946460400000057454250', 'hex')
	await writeFile(join(directory, 'actually-jpeg.png'), jpeg)
	await writeFile(join(directory, 'animation'), gif)
	await writeFile(join(directory, 'photo'), webp)
	const relay = await harness()
	await relay.submit({ instructions: '', images: [
		pathToFileURL(join(directory, 'local photo.png')).href,
		'actually-jpeg.png', '~/animation', 'photo',
	] })
	assert.deepEqual(calls[0].messages[0].message.content, [
		imageBlock(png), imageBlock(jpeg, 'image/jpeg'), imageBlock(gif, 'image/gif'), imageBlock(webp, 'image/webp'),
	])
})

test('invokes the fake attachment downloader once per source and removes temporary files', async () => {
	await fakeAmp()
	const relay = await harness()
	const instructions = `<attached_image path="${attachment}">Screenshot.</attached_image>\n<attached_image path='${attachment}'/>`
	await relay.submit({ instructions, images: [attachment] })
	assert.deepEqual(calls[0].messages[0].message.content, [imageBlock(png), { type: 'text', text: instructions }])
	const args = JSON.parse(await readFile(join(directory, 'download.json'), 'utf8'))
	assert.deepEqual(args.slice(0, 4), ['files', 'get', attachment, '-o'])
	assert.equal(args.length, 5)
	await assert.rejects(access(dirname(args[4])), { code: 'ENOENT' })
})

test('failed downloads skip the SDK, clean up, and allow an explicit retry', async () => {
	await fakeAmp('failure')
	const relay = await harness()
	const failure = await relay.submit({ instructions: 'Look at this', images: [attachment] })
	assert.match(failure, /attachment denied/)
	assert.equal(calls.length, 0)
	const args = JSON.parse(await readFile(join(directory, 'download.json'), 'utf8'))
	await assert.rejects(access(dirname(args[4])), { code: 'ENOENT' })
	await relay.submit({ instructions: 'Try the local copy.', images: ['local photo.png'] })
	assert.equal(calls[0].options.resume, undefined)
})

test('a failed new task cannot resume an earlier task by mistake', async () => {
	const relay = await harness()
	await relay.submit({ instructions: 'An earlier task.' })
	const failure = await relay.submit({ instructions: 'A different task.', images: ['missing.png'] })
	assert.match(failure, /ENOENT/)
	assert.equal(calls.length, 1)
	assert.match(await relay.submit({ instructions: 'Continue.', resume: true }), /No saved Claude task/)
	assert.equal(calls.length, 1)
})

test('cancellation stops the fake downloader before any SDK call and removes temporary files', async () => {
	await fakeAmp('pending')
	const relay = await harness()
	const pending = relay.submit({ instructions: '', images: [attachment] })
	let args: string[] | undefined
	for (let attempt = 0; attempt < 200 && !args; attempt++) {
		try { args = JSON.parse(await readFile(join(directory, 'download.json'), 'utf8')) }
		catch { await delay(10) }
	}
	assert.ok(args, 'attachment download started')
	await relay.stop()
	const result = await pending
	assert.match(result, /cancelled/)
	assert.equal(calls.length, 0)
	await assert.rejects(access(dirname(args[4])), { code: 'ENOENT' })
})

test('missing and unsupported files produce useful errors rather than text-only Claude turns', async () => {
	const relay = await harness()
	await writeFile(join(directory, 'not-a-photo.png'), '<html>Not an image</html>')
	const missing = await relay.submit({ instructions: 'Look', images: ['missing.png'] })
	assert.match(missing, /ENOENT/)
	const invalid = await relay.submit({ instructions: 'Look', images: ['not-a-photo.png'] })
	assert.match(invalid, /Unsupported image/)
	assert.equal(calls.length, 0)
})

test('invalid image arguments and empty submissions are rejected before side effects', async () => {
	const relay = await harness()
	for (const input of [
		{ instructions: '' }, { instructions: ' ', images: [] },
		{ instructions: 'Look', images: attachment }, { instructions: 'Look', images: [''] },
		{ instructions: 'Look', images: [null] }, { instructions: 'Look', images: null },
	]) await assert.rejects(relay.submit(input))
	assert.equal(calls.length, 0)
})
