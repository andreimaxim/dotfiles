/**
 * Session Usage Extension - shows session cost/usage breakdown
 *
 * Command: /usage
 * Displays a calendar heatmap of model usage per day and a cost breakdown table.
 * Switch between 7d / 30d / 90d views with ←/→ arrows.
 */

import { BorderedLoader, getAgentDir, type ExtensionAPI, type Theme } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { createReadStream, type Dirent } from "node:fs";
import fs from "node:fs/promises";
import { basename, join } from "node:path";
import * as readline from "node:readline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "7d" | "30d" | "90d";
const PERIODS: Period[] = ["7d", "30d", "90d"];

type ModelKey = string; // "provider/model"

interface AssistantMsg {
	model: ModelKey;
	cost: number;
	tokens: number;
	date: string; // YYYY-MM-DD (local)
}

interface SessionData {
	file: string;
	messages: AssistantMsg[];
}

interface DayStats {
	modelMessages: Map<ModelKey, number>;
	totalMessages: number;
	totalTokens: number;
	totalCost: number;
}

interface ModelRow {
	model: ModelKey;
	sessions: number;
	messages: number;
	cost: number;
	share: number;
}

interface Stats {
	sessionCount: number;
	totalMessages: number;
	totalTokens: number;
	totalCost: number;
	avgCost: number;
	dayMap: Map<string, DayStats>;
	modelTable: ModelRow[];
	modelCost: Map<ModelKey, number>;
	modelMessages: Map<ModelKey, number>;
	modelTokens: Map<ModelKey, number>;
}

interface RGB {
	r: number;
	g: number;
	b: number;
}

interface UsagePalette {
	modelColors: Map<ModelKey, RGB>;
	orderedModels: ModelKey[];
	otherColor: RGB;
}

type UsageProgressPhase = "scan" | "parse" | "finalize";

interface UsageProgressState {
	phase: UsageProgressPhase;
	foundFiles: number;
	parsedFiles: number;
	totalFiles: number;
	currentFile?: string;
}

// ---------------------------------------------------------------------------
// Colors & formatting
// ---------------------------------------------------------------------------

// Catppuccin Mocha-ish palette for top models
const PALETTE: RGB[] = [
	{ r: 166, g: 227, b: 161 }, // green
	{ r: 137, g: 180, b: 250 }, // blue
	{ r: 203, g: 166, b: 247 }, // mauve
	{ r: 250, g: 179, b: 135 }, // peach
	{ r: 148, g: 226, b: 213 }, // teal
	{ r: 245, g: 194, b: 231 }, // pink
	{ r: 249, g: 226, b: 175 }, // yellow
	{ r: 116, g: 199, b: 236 }, // sapphire
	{ r: 243, g: 139, b: 168 }, // red
	{ r: 242, g: 205, b: 205 }, // flamingo
];

const OTHER_COLOR: RGB = { r: 160, g: 160, b: 160 };
const DEFAULT_BG: RGB = { r: 30, g: 30, b: 46 };

function clamp01(x: number): number {
	return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function mixRgb(background: RGB, foreground: RGB, t: number): RGB {
	const alpha = clamp01(t);
	return {
		r: Math.round(lerp(background.r, foreground.r, alpha)),
		g: Math.round(lerp(background.g, foreground.g, alpha)),
		b: Math.round(lerp(background.b, foreground.b, alpha)),
	};
}

function weightedMix(colors: Array<{ color: RGB; weight: number }>, fallback: RGB): RGB {
	let total = 0;
	let r = 0;
	let g = 0;
	let b = 0;

	for (const entry of colors) {
		if (!Number.isFinite(entry.weight) || entry.weight <= 0) continue;
		total += entry.weight;
		r += entry.color.r * entry.weight;
		g += entry.color.g * entry.weight;
		b += entry.color.b * entry.weight;
	}

	if (total <= 0) return fallback;
	return { r: Math.round(r / total), g: Math.round(g / total), b: Math.round(b / total) };
}

function colorizeRgb(rgb: RGB, text: string): string {
	return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}\x1b[39m`;
}

function bgAnsiToFgAnsi(bgAnsi: string): string {
	if (bgAnsi === "\x1b[49m") return "\x1b[39m";
	return bgAnsi.replace("\x1b[48;", "\x1b[38;");
}

function colorizeWithThemeBg(theme: Theme, bg: "toolPendingBg", text: string): string {
	const fgAnsi = bgAnsiToFgAnsi(theme.getBgAnsi(bg));
	return `${fgAnsi}${text}\x1b[39m`;
}

function formatCount(n: number): string {
	if (!Number.isFinite(n) || n === 0) return "0";
	if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString("en-US");
}

// xterm 256-color conversion for background inference fallback
const ANSI16_RGB: RGB[] = [
	{ r: 0, g: 0, b: 0 },
	{ r: 205, g: 0, b: 0 },
	{ r: 0, g: 205, b: 0 },
	{ r: 205, g: 205, b: 0 },
	{ r: 0, g: 0, b: 238 },
	{ r: 205, g: 0, b: 205 },
	{ r: 0, g: 205, b: 205 },
	{ r: 229, g: 229, b: 229 },
	{ r: 127, g: 127, b: 127 },
	{ r: 255, g: 0, b: 0 },
	{ r: 0, g: 255, b: 0 },
	{ r: 255, g: 255, b: 0 },
	{ r: 92, g: 92, b: 255 },
	{ r: 255, g: 0, b: 255 },
	{ r: 0, g: 255, b: 255 },
	{ r: 255, g: 255, b: 255 },
];

function xterm256ToRgb(index: number): RGB {
	if (index < 0) return { r: 0, g: 0, b: 0 };
	if (index <= 15) return ANSI16_RGB[index] ?? { r: 0, g: 0, b: 0 };

	if (index >= 16 && index <= 231) {
		const cube = index - 16;
		const r6 = Math.floor(cube / 36);
		const g6 = Math.floor((cube % 36) / 6);
		const b6 = cube % 6;
		const toComp = (value: number) => (value === 0 ? 0 : 55 + value * 40);
		return { r: toComp(r6), g: toComp(g6), b: toComp(b6) };
	}

	if (index >= 232 && index <= 255) {
		const gray = 8 + (index - 232) * 10;
		return { r: gray, g: gray, b: gray };
	}

	return { r: 0, g: 0, b: 0 };
}

function parseBgAnsiRgb(bgAnsi: string): RGB | undefined {
	const trueColorMatch = bgAnsi.match(/\x1b\[48;2;(\d+);(\d+);(\d+)m/);
	if (trueColorMatch) {
		return {
			r: Number.parseInt(trueColorMatch[1]!, 10),
			g: Number.parseInt(trueColorMatch[2]!, 10),
			b: Number.parseInt(trueColorMatch[3]!, 10),
		};
	}

	const xtermMatch = bgAnsi.match(/\x1b\[48;5;(\d+)m/);
	if (xtermMatch) {
		const idx = Number.parseInt(xtermMatch[1]!, 10);
		if (!Number.isNaN(idx)) return xterm256ToRgb(idx);
	}

	return undefined;
}

function parseColorFGBGBackgroundRgb(colorfgbg: string | undefined): RGB | undefined {
	if (!colorfgbg) return undefined;

	const parts = colorfgbg
		.split(";")
		.map((part) => Number.parseInt(part, 10))
		.filter((n) => !Number.isNaN(n));
	if (parts.length === 0) return undefined;

	const bg = parts[parts.length - 1]!;
	if (bg < 0 || bg > 255) return undefined;
	return xterm256ToRgb(bg);
}

function setBorderedLoaderMessage(loader: BorderedLoader, message: string): void {
	const maybeLoader = loader as unknown as { loader?: unknown };
	const inner = maybeLoader.loader;
	if (typeof inner !== "object" || inner === null) return;

	const withSetMessage = inner as { setMessage?: (text: string) => void };
	if (typeof withSetMessage.setMessage === "function") {
		withSetMessage.setMessage(message);
	}
}

function displayModelName(modelKey: string): string {
	const idx = modelKey.indexOf("/");
	return idx === -1 ? modelKey : modelKey.slice(idx + 1);
}

// ---------------------------------------------------------------------------
// Date & parsing helpers
// ---------------------------------------------------------------------------

function fmtDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localMidnight(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDaysLocal(d: Date, days: number): Date {
	const next = new Date(d);
	next.setDate(next.getDate() + days);
	return next;
}

function periodDays(period: Period): number {
	return period === "7d" ? 7 : period === "30d" ? 30 : 90;
}

function cutoffDateKey(days: number): string {
	const start = addDaysLocal(localMidnight(new Date()), -(days - 1));
	return fmtDate(start);
}

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
	const m = typeof model === "string" ? model.trim() : "";
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

// ---------------------------------------------------------------------------
// Async session loading (recursive scan + streaming parser)
// ---------------------------------------------------------------------------

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
	const messages: AssistantMsg[] = [];

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

async function collectSessions(
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

// ---------------------------------------------------------------------------
// Stats & palette
// ---------------------------------------------------------------------------

function computeStats(sessions: SessionData[], period: Period): Stats {
	const cutoff = cutoffDateKey(periodDays(period));

	const dayMap = new Map<string, DayStats>();
	const modelCost = new Map<ModelKey, number>();
	const modelMessages = new Map<ModelKey, number>();
	const modelTokens = new Map<ModelKey, number>();
	const modelSessions = new Map<ModelKey, Set<string>>();

	let sessionCount = 0;

	for (const session of sessions) {
		const inPeriod = session.messages.filter((m) => m.date >= cutoff);
		if (inPeriod.length === 0) continue;
		sessionCount += 1;

		const sessionModels = new Set<ModelKey>();
		for (const msg of inPeriod) {
			let day = dayMap.get(msg.date);
			if (!day) {
				day = { modelMessages: new Map(), totalMessages: 0, totalTokens: 0, totalCost: 0 };
				dayMap.set(msg.date, day);
			}

			day.modelMessages.set(msg.model, (day.modelMessages.get(msg.model) ?? 0) + 1);
			day.totalMessages += 1;
			day.totalTokens += msg.tokens;
			day.totalCost += msg.cost;

			modelCost.set(msg.model, (modelCost.get(msg.model) ?? 0) + msg.cost);
			modelMessages.set(msg.model, (modelMessages.get(msg.model) ?? 0) + 1);
			modelTokens.set(msg.model, (modelTokens.get(msg.model) ?? 0) + msg.tokens);
			sessionModels.add(msg.model);
		}

		for (const model of sessionModels) {
			if (!modelSessions.has(model)) modelSessions.set(model, new Set());
			modelSessions.get(model)!.add(session.file);
		}
	}

	const totalCost = [...modelCost.values()].reduce((a, b) => a + b, 0);
	const totalMessages = [...modelMessages.values()].reduce((a, b) => a + b, 0);
	const totalTokens = [...modelTokens.values()].reduce((a, b) => a + b, 0);
	const useCostForShare = totalCost > 0;
	const shareDenominator = useCostForShare ? totalCost : totalMessages;

	const allModels = new Set<ModelKey>([
		...modelCost.keys(),
		...modelMessages.keys(),
		...modelTokens.keys(),
		...modelSessions.keys(),
	]);

	const modelTable: ModelRow[] = [...allModels]
		.map((model) => {
			const cost = modelCost.get(model) ?? 0;
			const messages = modelMessages.get(model) ?? 0;
			const shareValue = useCostForShare ? cost : messages;
			return {
				model,
				sessions: modelSessions.get(model)?.size ?? 0,
				messages,
				cost,
				share: shareDenominator > 0 ? Math.round((shareValue / shareDenominator) * 100) : 0,
			};
		})
		.sort((a, b) => {
			if (useCostForShare) {
				if (b.cost !== a.cost) return b.cost - a.cost;
				if (b.messages !== a.messages) return b.messages - a.messages;
				return a.model.localeCompare(b.model);
			}
			if (b.messages !== a.messages) return b.messages - a.messages;
			if (b.cost !== a.cost) return b.cost - a.cost;
			return a.model.localeCompare(b.model);
		});

	return {
		sessionCount,
		totalMessages,
		totalTokens,
		totalCost,
		avgCost: sessionCount > 0 ? totalCost / sessionCount : 0,
		dayMap,
		modelTable,
		modelCost,
		modelMessages,
		modelTokens,
	};
}

function choosePaletteFromLast30Days(sessions: SessionData[], topN = 4): UsagePalette {
	const stats30 = computeStats(sessions, "30d");
	const totalCost = [...stats30.modelCost.values()].reduce((a, b) => a + b, 0);

	const popularity =
		totalCost > 0
			? stats30.modelCost
			: stats30.totalTokens > 0
				? stats30.modelTokens
				: stats30.modelMessages;

	const orderedModels = [...popularity.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, topN)
		.map(([model]) => model);

	const modelColors = new Map<ModelKey, RGB>();
	for (let i = 0; i < orderedModels.length; i++) {
		modelColors.set(orderedModels[i]!, PALETTE[i % PALETTE.length]!);
	}

	return { modelColors, orderedModels, otherColor: OTHER_COLOR };
}

// ---------------------------------------------------------------------------
// UI Component
// ---------------------------------------------------------------------------

class UsageComponent {
	private sessions: SessionData[];
	private palette: UsagePalette;
	private period: Period = "30d";
	private stats: Stats;
	private onClose: () => void;
	private tui: { requestRender(): void };
	private theme: Theme;
	private cachedLines: string[] | undefined;
	private cachedWidth = 0;

	constructor(
		tui: { requestRender(): void },
		theme: Theme,
		sessions: SessionData[],
		palette: UsagePalette,
		onClose: () => void,
	) {
		this.tui = tui;
		this.theme = theme;
		this.sessions = sessions;
		this.palette = palette;
		this.onClose = onClose;
		this.stats = computeStats(sessions, this.period);
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape) || data === "q" || data === "Q") {
			this.onClose();
			return;
		}

		if (matchesKey(data, Key.left)) {
			const idx = PERIODS.indexOf(this.period);
			if (idx > 0) {
				this.period = PERIODS[idx - 1]!;
				this.stats = computeStats(this.sessions, this.period);
				this.invalidate();
				this.tui.requestRender();
			}
			return;
		}

		if (matchesKey(data, Key.right)) {
			const idx = PERIODS.indexOf(this.period);
			if (idx < PERIODS.length - 1) {
				this.period = PERIODS[idx + 1]!;
				this.stats = computeStats(this.sessions, this.period);
				this.invalidate();
				this.tui.requestRender();
			}
		}
	}

	invalidate(): void {
		this.cachedLines = undefined;
		this.cachedWidth = 0;
	}

	private getCalendarBackgroundRgb(): RGB {
		const fromTheme = parseBgAnsiRgb(this.theme.getBgAnsi("toolPendingBg"));
		if (fromTheme) return fromTheme;
		const fromEnv = parseColorFGBGBackgroundRgb(process.env.COLORFGBG);
		if (fromEnv) return fromEnv;
		return DEFAULT_BG;
	}

	private getDayMixedColor(dayStats: DayStats): RGB {
		const parts: Array<{ color: RGB; weight: number }> = [];
		let otherWeight = 0;

		for (const [model, count] of dayStats.modelMessages.entries()) {
			if (count <= 0) continue;
			const c = this.palette.modelColors.get(model);
			if (c) parts.push({ color: c, weight: count });
			else otherWeight += count;
		}

		if (otherWeight > 0) parts.push({ color: this.palette.otherColor, weight: otherWeight });
		return weightedMix(parts, this.palette.otherColor);
	}

	private renderCalendar(lines: string[], width: number): void {
		const days = periodDays(this.period);
		const now = new Date();
		const t = this.theme;

		const startDate = addDaysLocal(localMidnight(now), -(days - 1));
		const startDow = (startDate.getDay() + 6) % 7; // Mon=0
		const firstMon = addDaysLocal(startDate, -startDow);

		const grid: (DayStats | "" | null)[][] = Array.from({ length: 7 }, () => []);
		let maxCol = 0;

		for (let i = 0; i < days; i++) {
			const d = addDaysLocal(startDate, i);
			const dateStr = fmtDate(d);
			const row = (d.getDay() + 6) % 7;
			const daysSinceFirstMon = Math.round((d.getTime() - firstMon.getTime()) / 86_400_000);
			const col = Math.floor(daysSinceFirstMon / 7);

			while (grid[row]!.length <= col) grid[row]!.push(null);
			maxCol = Math.max(maxCol, col);

			const dayStats = this.stats.dayMap.get(dateStr);
			grid[row]![col] = dayStats ?? "";
		}

		for (let row = 0; row < 7; row++) {
			while (grid[row]!.length <= maxCol) grid[row]!.push(null);
		}

		const dayLabels = ["Mon", "   ", "Wed", "   ", "Fri", "   ", "   "];
		const calendarRows: string[] = [];
		const maxMessages = Math.max(0, ...[...this.stats.dayMap.values()].map((d) => d.totalMessages));
		const denom = Math.log1p(Math.max(0, maxMessages));
		const minVisible = 0.2;
		const bg = this.getCalendarBackgroundRgb();

		for (let row = 0; row < 7; row++) {
			let line = t.fg("text", dayLabels[row]!) + "  ";
			for (let col = 0; col <= maxCol; col++) {
				const cell = grid[row]![col];
				if (cell === null || cell === undefined) {
					line += "   ";
				} else if (cell === "") {
					line += t.bg("toolPendingBg", "  ") + " ";
				} else {
					const hue = this.getDayMixedColor(cell);
					const value = cell.totalMessages;
					const scaled = denom > 0 ? Math.log1p(value) / denom : 0;
					const intensity = minVisible + (1 - minVisible) * clamp01(scaled);
					const rgb = mixRgb(bg, hue, intensity);
					line += colorizeRgb(rgb, "██") + " ";
				}
			}
			calendarRows.push(line);
		}

		const legendRows = Array.from({ length: 7 }, () => "");
		legendRows[0] = t.fg("dim", "Legend (30d palette)");

		const legendModels = this.palette.orderedModels.slice(0, 4);
		for (let i = 0; i < legendModels.length; i++) {
			const model = legendModels[i]!;
			const color = this.palette.modelColors.get(model) ?? this.palette.otherColor;
			legendRows[i + 1] = `${colorizeRgb(color, "■")} ${displayModelName(model)}`;
		}

		legendRows[5] = `${colorizeRgb(this.palette.otherColor, "■")} ${t.fg("dim", "other")}`;
		legendRows[6] = `${colorizeWithThemeBg(this.theme, "toolPendingBg", "■")} ${t.fg("dim", "no usage")}`;

		const spacer = "   ";
		const calendarWidth = Math.max(...calendarRows.map((row) => visibleWidth(row)));
		const minLegendWidth = 18;
		const legendColumnWidth = Math.max(0, width - calendarWidth - visibleWidth(spacer));
		const showInlineLegend = legendColumnWidth >= minLegendWidth;

		for (let row = 0; row < 7; row++) {
			const calendarLine = calendarRows[row]!;
			if (showInlineLegend) {
				const legendLine = truncateToWidth(legendRows[row]!, legendColumnWidth, "");
				if (legendLine.length > 0) {
					lines.push(truncateToWidth(`${calendarLine}${spacer}${legendLine}`, width));
					continue;
				}
			}
			lines.push(truncateToWidth(calendarLine, width));
		}
	}

	private renderTable(lines: string[], width: number): void {
		const t = this.theme;
		const rows = this.stats.modelTable;
		if (rows.length === 0) return;

		const modelW = Math.max(5, ...rows.map((r) => r.model.length)) + 4;
		const sessW = 10;
		const costW = 12;
		const shareW = 8;

		lines.push(
			truncateToWidth(
				t.fg("dim", "  model".padEnd(modelW) + "sessions".padStart(sessW) + "cost".padStart(costW) + "share".padStart(shareW)),
				width,
			),
		);

		const totalW = modelW + sessW + costW + shareW;
		lines.push(truncateToWidth(t.fg("dim", "─".repeat(totalW)), width));

		for (const row of rows) {
			const color = this.palette.modelColors.get(row.model) ?? this.palette.otherColor;
			const swatch = colorizeRgb(color, "■");
			const modelCell = swatch + " " + row.model.padEnd(modelW - 2);
			lines.push(
				truncateToWidth(
					modelCell +
						String(row.sessions).padStart(sessW) +
						`$${row.cost.toFixed(2)}`.padStart(costW) +
						`${row.share}%`.padStart(shareW),
					width,
				),
			);
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;

		const lines: string[] = [];
		const t = this.theme;
		const s = this.stats;
		const pDays = periodDays(this.period);

		const tabs = PERIODS.map((p) => (p === this.period ? t.bold(`[${p}]`) : t.fg("dim", p))).join("  ");
		lines.push(truncateToWidth(`${t.bold("Session breakdown")}    ${tabs}    ${t.fg("dim", "←/→ to switch · q to close")}`, width));
		lines.push(truncateToWidth(t.fg("dim", `Sessions directory: ${join(getAgentDir(), "sessions")}`), width));
		lines.push("");

		if (s.sessionCount === 0) {
			lines.push(truncateToWidth(t.fg("warning", `No sessions found in the last ${pDays} days.`), width));
			this.cachedLines = lines;
			this.cachedWidth = width;
			return lines;
		}

		lines.push(
			truncateToWidth(
				t.fg(
					"success",
					`Last ${pDays} days: ${s.sessionCount} sessions · ${formatCount(s.totalMessages)} msgs · $${s.totalCost.toFixed(2)} · avg $${s.avgCost.toFixed(3)}/session`,
				),
				width,
			),
		);
		lines.push("");
		lines.push(truncateToWidth(t.fg("dim", "Graph: color = model mix, brightness = message count"), width));
		lines.push("");

		this.renderCalendar(lines, width);
		lines.push("");
		this.renderTable(lines, width);

		this.cachedLines = lines;
		this.cachedWidth = width;
		return lines;
	}
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	pi.registerCommand("usage", {
		description: "Show session usage breakdown (cost, models, calendar heatmap)",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Usage view requires interactive mode", "error");
				return;
			}

			let aborted = false;
			const sessions = await ctx.ui.custom<SessionData[] | null>((tui, theme, _kb, done) => {
				const baseMessage = "Analyzing sessions (last 90 days)…";
				const loader = new BorderedLoader(tui, theme, baseMessage);

				const startedAt = Date.now();
				const progress: UsageProgressState = {
					phase: "scan",
					foundFiles: 0,
					parsedFiles: 0,
					totalFiles: 0,
					currentFile: undefined,
				};

				const renderMessage = (): string => {
					const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
					if (progress.phase === "scan") {
						return `${baseMessage}  scanning (${formatCount(progress.foundFiles)} files) · ${elapsed}s`;
					}
					if (progress.phase === "parse") {
						return `${baseMessage}  parsing (${formatCount(progress.parsedFiles)}/${formatCount(progress.totalFiles)}) · ${elapsed}s`;
					}
					return `${baseMessage}  finalizing · ${elapsed}s`;
				};

				setBorderedLoaderMessage(loader, renderMessage());
				const ticker = setInterval(() => setBorderedLoaderMessage(loader, renderMessage()), 500);
				const stopTicker = () => clearInterval(ticker);

				loader.onAbort = () => {
					aborted = true;
					stopTicker();
					done(null);
				};

				collectSessions(loader.signal, (update) => Object.assign(progress, update))
					.then((data) => {
						stopTicker();
						if (!aborted) done(data);
					})
					.catch(() => {
						stopTicker();
						if (!aborted) done(null);
					});

				return loader;
			});

			if (!sessions) {
				ctx.ui.notify(aborted ? "Cancelled" : "Failed to analyze sessions", aborted ? "info" : "error");
				return;
			}

			const palette = choosePaletteFromLast30Days(sessions, 4);

			await ctx.ui.custom((tui, theme, _kb, done) => {
				return new UsageComponent(tui, theme, sessions, palette, () => done(undefined));
			});
		},
	});
}
