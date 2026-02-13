import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { createReadStream, type Dirent } from "node:fs";
import fs from "node:fs/promises";
import { basename, join } from "node:path";
import * as readline from "node:readline";
import { parseModel } from "./model";
import { addDaysLocal, fmtDate, localMidnight, periodDays } from "./time";
import type { ModelKey, SessionData, UsageProgressState } from "./types";

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function readNumber(value: unknown): number {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value === "string") {
		const n = Number(value);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

function parseTimestampMs(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const ms = new Date(value).getTime();
		if (Number.isFinite(ms)) return ms;
	}
	return undefined;
}

function modelKeyFromParts(provider: unknown, model: unknown): ModelKey | null {
	const p = typeof provider === "string" ? provider.trim() : "";
	const m = typeof model === "string" ? parseModel(model.trim()).family : "";
	if (!p && !m) return null;
	if (!p) return m;
	if (!m) return p;
	return `${p}/${m}`;
}

function parseSessionStartFromFilename(name: string): Date | null {
	// Example: 2026-02-02T21-52-28-774Z_<uuid>.jsonl
	const match = name.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_/);
	if (!match) return null;
	const iso = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
	const d = new Date(iso);
	return Number.isFinite(d.getTime()) ? d : null;
}

function extractProviderModelAndUsage(entry: Record<string, unknown>): {
	provider: unknown;
	model: unknown;
	modelId: unknown;
	usage: unknown;
} {
	const msg = asRecord(entry.message);
	return {
		provider: entry.provider ?? msg?.provider,
		model: entry.model ?? msg?.model,
		modelId: entry.modelId ?? msg?.modelId,
		usage: entry.usage ?? msg?.usage,
	};
}

function extractRole(entry: Record<string, unknown>): string | undefined {
	if (typeof entry.role === "string") return entry.role;
	const msg = asRecord(entry.message);
	if (msg && typeof msg.role === "string") return msg.role;
	return undefined;
}

function extractCostTotal(usage: unknown): number {
	const u = asRecord(usage);
	if (!u) return 0;
	const c = u.cost;
	if (typeof c === "number" || typeof c === "string") return readNumber(c);
	const cr = asRecord(c);
	return readNumber(cr?.total);
}

function extractTokensTotal(usage: unknown): number {
	const u = asRecord(usage);
	if (!u) return 0;

	const direct =
		readNumber(u.totalTokens) ||
		readNumber(u.total_tokens) ||
		readNumber(u.tokens) ||
		readNumber(u.tokenCount) ||
		readNumber(u.token_count);
	if (direct > 0) return direct;

	const tokensObj = asRecord(u.tokens);
	const nested = readNumber(tokensObj?.total) || readNumber(tokensObj?.totalTokens) || readNumber(tokensObj?.total_tokens);
	if (nested > 0) return nested;

	const input =
		readNumber(u.promptTokens) ||
		readNumber(u.prompt_tokens) ||
		readNumber(u.inputTokens) ||
		readNumber(u.input_tokens);
	const output =
		readNumber(u.completionTokens) ||
		readNumber(u.completion_tokens) ||
		readNumber(u.outputTokens) ||
		readNumber(u.output_tokens);
	const sum = input + output;
	return sum > 0 ? sum : 0;
}

async function walkSessionFiles(
	root: string,
	startCutoffLocal: Date,
	signal?: AbortSignal,
	onFound?: (found: number) => void,
): Promise<string[]> {
	const out: string[] = [];
	const stack: string[] = [root];

	while (stack.length > 0) {
		if (signal?.aborted) break;
		const dir = stack.pop()!;

		let entries: Dirent[] = [];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			if (signal?.aborted) break;
			const filePath = join(dir, entry.name);

			if (entry.isDirectory()) {
				stack.push(filePath);
				continue;
			}
			if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;

			const startedAt = parseSessionStartFromFilename(entry.name);
			if (startedAt) {
				if (localMidnight(startedAt) >= startCutoffLocal) {
					out.push(filePath);
					if (onFound && out.length % 10 === 0) onFound(out.length);
				}
				continue;
			}

			try {
				const st = await fs.stat(filePath);
				if (localMidnight(new Date(st.mtimeMs)) >= startCutoffLocal) {
					out.push(filePath);
					if (onFound && out.length % 10 === 0) onFound(out.length);
				}
			} catch {
				// ignore unreadable files
			}
		}
	}

	onFound?.(out.length);
	return out;
}

async function parseSessionFile(filePath: string, startCutoffDayKey: string, signal?: AbortSignal): Promise<SessionData | null> {
	let startedAt = parseSessionStartFromFilename(basename(filePath));
	let currentModel: ModelKey | null = null;
	const messages: SessionData["messages"] = [];

	const stream = createReadStream(filePath, { encoding: "utf8" });
	const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

	try {
		for await (const line of rl) {
			if (signal?.aborted) {
				rl.close();
				stream.destroy();
				return null;
			}
			if (!line) continue;

			let parsed: unknown;
			try {
				parsed = JSON.parse(line);
			} catch {
				continue;
			}
			const entry = asRecord(parsed);
			if (!entry) continue;

			if (!startedAt && entry.type === "session") {
				const ts = parseTimestampMs(entry.timestamp);
				if (ts !== undefined) startedAt = new Date(ts);
				continue;
			}

			if (entry.type === "model_change") {
				const mk = modelKeyFromParts(entry.provider, entry.modelId) ?? modelKeyFromParts(entry.provider, entry.model);
				if (mk) currentModel = mk;
				continue;
			}

			if (entry.type !== "message") continue;
			if (extractRole(entry) !== "assistant") continue;

			const extracted = extractProviderModelAndUsage(entry);
			const model =
				modelKeyFromParts(extracted.provider, extracted.model) ??
				modelKeyFromParts(extracted.provider, extracted.modelId) ??
				currentModel ??
				"unknown";

			const msg = asRecord(entry.message);
			const ts = parseTimestampMs(msg?.timestamp) ?? parseTimestampMs(entry.timestamp) ?? startedAt?.getTime();
			if (ts === undefined) continue;

			const date = fmtDate(new Date(ts));
			if (date < startCutoffDayKey) continue;

			messages.push({
				model,
				cost: extractCostTotal(extracted.usage),
				tokens: extractTokensTotal(extracted.usage),
				date,
			});
		}
	} finally {
		rl.close();
		stream.destroy();
	}

	if (messages.length === 0) return null;
	return { file: filePath, messages };
}

export async function collectSessions(
	signal?: AbortSignal,
	onProgress?: (update: Partial<UsageProgressState>) => void,
): Promise<SessionData[]> {
	const sessionsDir = join(getAgentDir(), "sessions");
	const start90 = addDaysLocal(localMidnight(new Date()), -(periodDays("90d") - 1));
	const start90Key = fmtDate(start90);

	onProgress?.({ phase: "scan", foundFiles: 0, parsedFiles: 0, totalFiles: 0, currentFile: undefined });

	const candidates = await walkSessionFiles(sessionsDir, start90, signal, (found) => {
		onProgress?.({ phase: "scan", foundFiles: found });
	});

	const totalFiles = candidates.length;
	onProgress?.({
		phase: "parse",
		foundFiles: totalFiles,
		totalFiles,
		parsedFiles: 0,
		currentFile: totalFiles > 0 ? basename(candidates[0]!) : undefined,
	});

	const sessions: SessionData[] = [];
	let parsedFiles = 0;

	for (const filePath of candidates) {
		if (signal?.aborted) break;
		parsedFiles += 1;
		onProgress?.({ phase: "parse", parsedFiles, totalFiles, currentFile: basename(filePath) });

		const session = await parseSessionFile(filePath, start90Key, signal);
		if (session && session.messages.length > 0) sessions.push(session);
	}

	onProgress?.({ phase: "finalize", currentFile: undefined });
	return sessions;
}
