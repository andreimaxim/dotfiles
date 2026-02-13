import type { RGB } from "./types"

/**
 * Model identity parsing.
 *
 * Parses raw model IDs into structured info: who made it (vendor)
 * and what product family it belongs to.
 *
 *   claude-opus-4-6            → { vendor: "anthropic", family: "claude-opus" }
 *   claude-3-5-haiku-20241022  → { vendor: "anthropic", family: "claude-haiku" }
 *   gpt-5.2-codex              → { vendor: "openai",    family: "gpt-5-codex" }
 *   gpt-5.1-codex-max          → { vendor: "openai",    family: "gpt-5-codex" }
 *   gpt-5.1-codex-mini         → { vendor: "openai",    family: "gpt-5-codex-mini" }
 *   gpt-5-chat-latest          → { vendor: "openai",    family: "gpt-5" }
 *   codex-mini-latest          → { vendor: "openai",    family: "gpt-5-codex-mini" }
 *   o3-mini                    → { vendor: "openai",    family: "o3-mini" }
 *   gemini-3-pro-preview       → { vendor: "google",    family: "gemini-pro" }
 *   kimi-k2.5-free             → { vendor: "kimi",      family: "kimi" }
 *   minimax-m2.5-free          → { vendor: "minimax",   family: "minimax" }
 *   qwen3-coder                → { vendor: "qwen",      family: "qwen-coder" }
 *   grok-code-fast-1           → { vendor: "xai",       family: "grok-code" }
 *   glm-4.7                    → { vendor: "zhipu",     family: "glm" }
 */

export interface ModelInfo {
	vendor: string
	family: string
	color: RGB
}

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

type Strategy = (cleaned: string) => string

/** Always returns the same name. */
function constant(name: string): Strategy {
	return () => name
}

/** Scans for a known keyword, returns `{prefix}-{keyword}`. Falls back to cleaned id. */
function keyword(prefix: string, keywords: string[]): Strategy {
	return (cleaned) => {
		for (const kw of keywords) {
			if (cleaned.includes(kw)) return `${prefix}-${kw}`
		}
		return cleaned
	}
}

/** Strips version numbers, keeps variant suffix: `{prefix}[-{variant}]`. */
function versionStrip(prefix: string): Strategy {
	const pattern = new RegExp(`^${prefix}-?[\\d.]+(?:-(.+))?$`)
	return (cleaned) => {
		const match = cleaned.match(pattern)
		if (!match) return cleaned
		return match[1] ? `${prefix}-${match[1]}` : prefix
	}
}

/** Keeps major version, strips minor: `{prefix}-{major}[-{variant}]`. */
function majorVersionKeep(prefix: string): Strategy {
	const pattern = new RegExp(`^${prefix}-(\\d+)(?:\\.\\d+)?(?:-(.+))?$`)
	return (cleaned) => {
		const match = cleaned.match(pattern)
		if (!match) return cleaned
		const major = match[1]
		const variant = match[2]
		return variant ? `${prefix}-${major}-${variant}` : `${prefix}-${major}`
	}
}

/** Returns the cleaned name unchanged. */
function identity(): Strategy {
	return (cleaned) => cleaned
}

// ---------------------------------------------------------------------------
// Vendor table
// ---------------------------------------------------------------------------

interface VendorRule {
	vendor: string
	color: RGB
	match: string | RegExp
	strategy: Strategy
}

const ANTHROPIC: RGB = { r: 250, g: 179, b: 135 } // peach
const OPENAI: RGB = { r: 137, g: 180, b: 250 } // blue
const GOOGLE: RGB = { r: 148, g: 226, b: 213 } // teal
const ZHIPU: RGB = { r: 249, g: 226, b: 175 } // yellow/gold
const MINIMAX: RGB = { r: 243, g: 139, b: 168 } // red

const UNKNOWN_COLOR: RGB = { r: 160, g: 160, b: 160 } // gray

const VENDORS: VendorRule[] = [
	{ vendor: "anthropic", color: ANTHROPIC, match: "claude-", strategy: keyword("claude", ["opus", "sonnet", "haiku"]) },
	{ vendor: "openai", color: OPENAI, match: "gpt-", strategy: majorVersionKeep("gpt") },
	{ vendor: "openai", color: OPENAI, match: /^o\d/, strategy: identity() },
	{ vendor: "google", color: GOOGLE, match: "gemini-", strategy: versionStrip("gemini") },
	{ vendor: "zhipu", color: ZHIPU, match: "glm-", strategy: versionStrip("glm") },
	{ vendor: "kimi", color: UNKNOWN_COLOR, match: "kimi-", strategy: constant("kimi") },
	{ vendor: "minimax", color: MINIMAX, match: "minimax-", strategy: constant("minimax") },
	{ vendor: "qwen", color: UNKNOWN_COLOR, match: "qwen", strategy: versionStrip("qwen") },
	{ vendor: "xai", color: UNKNOWN_COLOR, match: "grok-code", strategy: constant("grok-code") },
	{ vendor: "xai", color: UNKNOWN_COLOR, match: "grok-", strategy: versionStrip("grok") },
]

// ---------------------------------------------------------------------------
// Aliases (before cleaning, maps raw id → ModelInfo)
// ---------------------------------------------------------------------------

const ALIASES: Record<string, ModelInfo> = {
	"codex-mini-latest": { vendor: "openai", family: "gpt-5-codex-mini", color: OPENAI },
	"codex-mini": { vendor: "openai", family: "gpt-5-codex-mini", color: OPENAI },
}

// ---------------------------------------------------------------------------
// Cleaning
// ---------------------------------------------------------------------------

/**
 * Suffixes stripped from model IDs before family detection.
 *
 * - Reasoning effort: -max, -chat
 * - Reasoning mode:   -thinking
 * - Pricing tier:     -free
 * - Release stage:    -preview
 * - Alias:            -latest
 */
const STRIP_SUFFIXES = ["-max", "-chat", "-thinking", "-free", "-preview", "-latest"]

function cleanModelId(id: string): string {
	let result = id

	let changed = true
	while (changed) {
		changed = false
		for (const suffix of STRIP_SUFFIXES) {
			if (result.endsWith(suffix)) {
				result = result.slice(0, -suffix.length)
				changed = true
			}
		}
	}

	// YYYYMMDD date stamps (e.g., claude-3-5-sonnet-20241022)
	result = result.replace(/-\d{8}/g, "")

	// Bedrock-style version qualifiers (e.g., -v1, -v1:0)
	result = result.replace(/-v\d+(?::\d+)?$/, "")

	return result
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function matches(cleaned: string, match: string | RegExp): boolean {
	if (typeof match === "string") return cleaned.startsWith(match)
	return match.test(cleaned)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Parse a raw model ID into vendor, family, and color. */
export function parseModel(modelId: string): ModelInfo {
	if (!modelId) return { vendor: "unknown", family: "", color: UNKNOWN_COLOR }

	const alias = ALIASES[modelId]
	if (alias) return alias

	const cleaned = cleanModelId(modelId)

	for (const rule of VENDORS) {
		if (matches(cleaned, rule.match)) {
			return { vendor: rule.vendor, family: rule.strategy(cleaned), color: rule.color }
		}
	}

	return { vendor: "unknown", family: cleaned, color: UNKNOWN_COLOR }
}
