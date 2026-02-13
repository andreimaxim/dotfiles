import type { Theme } from "@mariozechner/pi-coding-agent";
import type { DayBlend, OkLab, RGB } from "./types";


export const DEFAULT_BG: RGB = { r: 30, g: 30, b: 46 };

export function clamp01(x: number): number {
	return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function mixRgb(background: RGB, foreground: RGB, t: number): RGB {
	const alpha = clamp01(t);
	return {
		r: Math.round(lerp(background.r, foreground.r, alpha)),
		g: Math.round(lerp(background.g, foreground.g, alpha)),
		b: Math.round(lerp(background.b, foreground.b, alpha)),
	};
}

// --- OkLab perceptual color space ---

function linearize(c: number): number {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function delinearize(c: number): number {
	return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

export function rgbToOklab(rgb: RGB): OkLab {
	const r = linearize(rgb.r / 255);
	const g = linearize(rgb.g / 255);
	const b = linearize(rgb.b / 255);

	const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
	const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
	const s = 0.0883024619 * r + 0.2164757980 * g + 0.6952217402 * b;

	const lc = Math.cbrt(l);
	const mc = Math.cbrt(m);
	const sc = Math.cbrt(s);

	return {
		L: 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc,
		a: 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc,
		b: 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc,
	};
}

export function oklabToRgb(lab: OkLab): RGB {
	const lc = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
	const mc = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
	const sc = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;

	const l = lc * lc * lc;
	const m = mc * mc * mc;
	const s = sc * sc * sc;

	return {
		r: Math.round(clamp01(delinearize(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)) * 255),
		g: Math.round(clamp01(delinearize(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)) * 255),
		b: Math.round(clamp01(delinearize(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)) * 255),
	};
}

export function mixOklab(a: OkLab, b: OkLab, t: number): OkLab {
	const alpha = clamp01(t);
	return {
		L: lerp(a.L, b.L, alpha),
		a: lerp(a.a, b.a, alpha),
		b: lerp(a.b, b.b, alpha),
	};
}

// --- Painterly day-color blending ---

const DOMINANT_TINT = 0.2;
const ACCENT_TINT = 0.1;
const ACCENT_THRESHOLD = 0.12;

export function classifyDayBlend(entries: Array<{ color: RGB; count: number }>, fallback: RGB): DayBlend {
	const sorted = entries.filter((e) => e.count > 0).sort((a, b) => b.count - a.count);

	if (sorted.length === 0) return { kind: "pure", color: fallback };

	const first = sorted[0]!;
	if (sorted.length === 1) return { kind: "pure", color: first.color };

	const second = sorted[1]!;
	const dominance = first.count / (first.count + second.count);

	if (dominance >= 0.80) return { kind: "pure", color: first.color };
	if (dominance >= 0.65) return { kind: "dominant", primary: first.color, tint: second.color };

	let accent: RGB | undefined;
	if (sorted.length >= 3) {
		const third = sorted[2]!;
		const total = first.count + second.count + third.count;
		if (third.count / total >= ACCENT_THRESHOLD) accent = third.color;
	}

	const ratio = second.count / (first.count + second.count);
	return { kind: "balanced", first: first.color, second: second.color, ratio, accent };
}

export function blendDayColor(blend: DayBlend): RGB {
	switch (blend.kind) {
		case "pure":
			return blend.color;
		case "dominant": {
			const a = rgbToOklab(blend.primary);
			const b = rgbToOklab(blend.tint);
			return oklabToRgb(mixOklab(a, b, DOMINANT_TINT));
		}
		case "balanced": {
			const a = rgbToOklab(blend.first);
			const b = rgbToOklab(blend.second);
			let mixed = mixOklab(a, b, blend.ratio);
			if (blend.accent) {
				mixed = mixOklab(mixed, rgbToOklab(blend.accent), ACCENT_TINT);
			}
			return oklabToRgb(mixed);
		}
	}
}

export function colorizeRgb(rgb: RGB, text: string): string {
	return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}\x1b[39m`;
}

function bgAnsiToFgAnsi(bgAnsi: string): string {
	if (bgAnsi === "\x1b[49m") return "\x1b[39m";
	return bgAnsi.replace("\x1b[48;", "\x1b[38;");
}

export function colorizeWithThemeBg(theme: Theme, bg: "toolPendingBg", text: string): string {
	const fgAnsi = bgAnsiToFgAnsi(theme.getBgAnsi(bg));
	return `${fgAnsi}${text}\x1b[39m`;
}

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

export function parseBgAnsiRgb(bgAnsi: string): RGB | undefined {
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

export function parseColorFGBGBackgroundRgb(colorfgbg: string | undefined): RGB | undefined {
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
