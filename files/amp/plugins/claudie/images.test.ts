import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, afterEach, beforeEach, test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { PluginAPI, PluginToolContext, PluginToolDefinition } from '@ampcode/plugin'
import type { Options, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk@0.3.285'

// Run against either the dotfiles source or the installed relay without starting Claude.
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
let dispose: () => Promise<void>

beforeEach(async () => {
	calls = []
	dispose = async () => {}
	directory = await mkdtemp(join(tmpdir(), 'claude image tests '))
	oldPath = process.env.PATH
	oldHome = process.env.HOME
	process.env.PATH = `${directory}:${oldPath}`
	process.env.HOME = directory
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
			result: 'Image received.', permission_denials: [],
		}
	})()
	return Object.assign(stream, { close() {} })
}

async function harness() {
	const tools = new Map<string, PluginToolDefinition>()
	await load({
		system: { workspaceRoot: pathToFileURL(directory) },
		helpers: { filePathFromURI: fileURLToPath },
		onDispose: (callback: () => Promise<void>) => { dispose = callback },
		registerTool: (tool: PluginToolDefinition) => { tools.set(tool.name, tool) },
		registerCommand() {},
		registerSkill: async () => {},
	} as unknown as PluginAPI)
	const ctx = {
		thread: { id: 'T-test', state: { subscribe: () => ({ unsubscribe() {} }) } },
	} as unknown as PluginToolContext
	const call = async (name: string, input: Record<string, unknown>) =>
		await tools.get(name)!.execute(input, ctx) as string
	return {
		tools,
		call,
		async submit(input: Record<string, unknown>) {
			const preview = await call('claude_send', { mode: 'implement', ...input })
			const sessionID = preview.startsWith('{')
				? JSON.parse(preview).session_id
				: preview.match(/Claude session: ([0-9a-f-]{36})/)![1]
			return { preview, sessionID }
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

test('routes implementation to Opus and external-oracle consultations to read-only Fable/high', async () => {
	const relay = await harness()
	const implementation = await relay.submit({ mode: 'implement', instructions: 'Implement the agreed change.' })
	await relay.call('claude_wait', { session_id: implementation.sessionID })
	const worker = calls[0].options
	assert.equal(worker.model, 'claude-opus-5-5')
	assert.equal(worker.effort, 'high')
	assert.equal(worker.tools, undefined)
	assert.equal(worker.strictMcpConfig, undefined)
	assert.equal(worker.canUseTool, undefined)
	assert.notEqual(worker.permissionMode, 'plan')

	const instructions = 'Review the change against the original requirements; do not fix it.'
	const review = await relay.submit({ mode: 'consult', instructions })
	const response = await relay.call('claude_wait', { session_id: review.sessionID })
	assert.match(response, /Image received\./)
	assert.notEqual(review.sessionID, implementation.sessionID)
	assert.equal(calls[1].prompt, instructions)
	const advisor = calls[1].options
	assert.equal(advisor.sessionId, review.sessionID)
	assert.equal(advisor.resume, undefined)
	assert.equal(advisor.model, 'claude-fable-5-1')
	assert.equal(advisor.effort, 'high')
	assert.equal(advisor.permissionMode, 'plan')
	assert.notEqual(advisor.allowDangerouslySkipPermissions, true)
	assert.deepEqual(advisor.tools, ['Read', 'Glob', 'Grep', 'Bash'])
	assert.deepEqual(advisor.disallowedTools, ['mcp__*'])
	assert.equal(advisor.strictMcpConfig, true)
	assert.equal(advisor.allowedTools, undefined)
	assert.match(advisor.planModeInstructions!, /external oracle/)
	assert.ok(advisor.systemPrompt)
	const prompt = JSON.stringify(advisor.systemPrompt)
	assert.match(prompt, /external oracle: a read-only engineering advisor/)
	assert.match(prompt, /original requirements/)
	assert.doesNotMatch(prompt, /You are implementing an agreed plan/)
	for (const [tool, input] of [
		['Bash', { command: 'touch should-not-exist' }],
		['Write', { file_path: 'should-not-exist', content: 'no' }],
		['ExitPlanMode', {}],
		['mcp__github__create_issue', {}],
	] as const) {
		const decision = await advisor.canUseTool!(tool, input, {
			signal: new AbortController().signal, toolUseID: 'permission-test',
		})
		assert.equal(decision.behavior, 'deny')
	}
})

test('resumes Fable consultations after reload with unchanged follow-ups and images', async () => {
	const relay = await harness()
	const first = await relay.submit({ mode: 'consult', instructions: 'Give a second opinion on options A and B.' })
	await relay.call('claude_wait', { session_id: first.sessionID })
	await dispose()
	const reloaded = await harness()
	const instructions = '  Does this screenshot change your recommendation?\n'
	const next = await reloaded.submit({
		mode: 'consult', session_id: first.sessionID, instructions, images: ['local photo.png'],
	})
	await reloaded.call('claude_wait', { session_id: next.sessionID })
	assert.equal(next.sessionID, first.sessionID)
	assert.equal(calls[1].options.resume, first.sessionID)
	assert.equal(calls[1].options.sessionId, undefined)
	assert.equal(calls[1].options.model, 'claude-fable-5-1')
	assert.equal(calls[1].options.effort, 'high')
	assert.equal(calls[1].options.permissionMode, 'plan')
	assert.deepEqual(calls[1].messages[0].message.content, [imageBlock(png), { type: 'text', text: instructions }])
})

test('requires an explicit valid mode before starting either flow', async () => {
	const relay = await harness()
	assert.deepEqual([...relay.tools.keys()], ['claude_send', 'claude_wait'])
	assert.deepEqual(relay.tools.get('claude_send')!.inputSchema.required, ['mode', 'instructions'])
	for (const mode of [undefined, null, '', 'review', 'opus']) {
		await assert.rejects(relay.call('claude_send', { mode, instructions: 'Review this.' }), /mode must be/)
	}
	assert.equal(calls.length, 0)
})

test('text-only prompts remain literal strings, including empty image lists', async () => {
	const relay = await harness()
	const instructions = '  Literal $HOME and `quotes`\r\nKeep trailing spaces.  '
	const { sessionID } = await relay.submit({ instructions, images: [] })
	await relay.call('claude_wait', { session_id: sessionID })
	assert.equal(calls.length, 1)
	assert.equal(calls[0].prompt, instructions)
	assert.equal(calls[0].options.sessionId, sessionID)
})

test('new and resumed sessions receive native image blocks and unchanged message text', async () => {
	const relay = await harness()
	const instructions = '  Describe this photograph.\n'
	const { preview, sessionID } = await relay.submit({ instructions, images: ['local photo.png'] })
	await relay.call('claude_wait', { session_id: sessionID })
	assert.equal(calls[0].options.sessionId, sessionID)
	assert.deepEqual(calls[0].messages, [{
		type: 'user', parent_tool_use_id: null,
		message: { role: 'user', content: [imageBlock(png), { type: 'text', text: instructions }] },
	}])
	assert.ok(!preview.includes(png.toString('base64')))

	const followUp = `<attached_image path="${join(directory, 'local photo.png')}">Original caption.</attached_image>`
	const resumed = await relay.submit({ instructions: followUp, session_id: sessionID })
	await relay.call('claude_wait', { session_id: resumed.sessionID })
	assert.equal(resumed.sessionID, sessionID)
	assert.equal(calls[1].options.resume, sessionID)
	assert.equal(calls[1].options.sessionId, undefined)
	assert.deepEqual(calls[1].messages[0].message.content, [imageBlock(png), { type: 'text', text: followUp }])
})

test('image-only messages support file URLs and detect the format from bytes, not the filename', async () => {
	const jpeg = Buffer.from('ffd8ffe000104a464946000101', 'hex')
	const gif = Buffer.from('GIF89a')
	const webp = Buffer.from('524946460400000057454250', 'hex')
	await writeFile(join(directory, 'actually-jpeg.png'), jpeg)
	await writeFile(join(directory, 'animation'), gif)
	await writeFile(join(directory, 'photo'), webp)
	const relay = await harness()
	const { sessionID } = await relay.submit({ instructions: '', images: [
		pathToFileURL(join(directory, 'local photo.png')).href,
		'actually-jpeg.png', '~/animation', 'photo',
	] })
	await relay.call('claude_wait', { session_id: sessionID })
	assert.deepEqual(calls[0].messages[0].message.content, [
		imageBlock(png), imageBlock(jpeg, 'image/jpeg'), imageBlock(gif, 'image/gif'), imageBlock(webp, 'image/webp'),
	])
})

test('private attachment tags use authenticated amp files get once and remove downloaded files', async () => {
	await fakeAmp()
	const relay = await harness()
	const instructions = `<attached_image path="${attachment}">Screenshot.</attached_image>\n<attached_image path='${attachment}'/>`
	const { sessionID } = await relay.submit({ instructions, images: [attachment] })
	await relay.call('claude_wait', { session_id: sessionID })
	assert.deepEqual(calls[0].messages[0].message.content, [imageBlock(png), { type: 'text', text: instructions }])
	const args = JSON.parse(await readFile(join(directory, 'download.json'), 'utf8'))
	assert.deepEqual(args.slice(0, 4), ['files', 'get', attachment, '-o'])
	assert.equal(args.length, 5)
	await assert.rejects(access(dirname(args[4])), { code: 'ENOENT' })
})

test('failed downloads do not start Claude, clean up, and allow an explicit retry', async () => {
	await fakeAmp('failure')
	const relay = await harness()
	const { sessionID } = await relay.submit({ instructions: 'Look at this', images: [attachment] })
	const failure = await relay.call('claude_wait', { session_id: sessionID })
	assert.match(failure, /attachment denied/)
	assert.equal(calls.length, 0)
	const args = JSON.parse(await readFile(join(directory, 'download.json'), 'utf8'))
	await assert.rejects(access(dirname(args[4])), { code: 'ENOENT' })
	await relay.submit({ instructions: 'Try the local copy.', images: ['local photo.png'], session_id: sessionID })
	await relay.call('claude_wait', { session_id: sessionID })
	assert.equal(calls[0].options.resume, sessionID)
})

test('cancellation aborts an attachment download without starting Claude or leaving temp files', async () => {
	await fakeAmp('pending')
	const relay = await harness()
	const { sessionID } = await relay.submit({ instructions: '', images: [attachment] })
	let args: string[] | undefined
	for (let attempt = 0; attempt < 200 && !args; attempt++) {
		try { args = JSON.parse(await readFile(join(directory, 'download.json'), 'utf8')) }
		catch { await delay(10) }
	}
	assert.ok(args, 'attachment download started')
	const result = await relay.call('claude_wait', { session_id: sessionID, cancel: true })
	assert.match(result, /cancelled/)
	assert.equal(calls.length, 0)
	await assert.rejects(access(dirname(args[4])), { code: 'ENOENT' })
})

test('missing and unsupported files produce useful errors rather than text-only Claude turns', async () => {
	const relay = await harness()
	await writeFile(join(directory, 'not-a-photo.png'), '<html>Not an image</html>')
	const missing = await relay.submit({ instructions: 'Look', images: ['missing.png'] })
	assert.match(await relay.call('claude_wait', { session_id: missing.sessionID }), /ENOENT/)
	const invalid = await relay.submit({ instructions: 'Look', images: ['not-a-photo.png'] })
	assert.match(await relay.call('claude_wait', { session_id: invalid.sessionID }), /Unsupported image/)
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
