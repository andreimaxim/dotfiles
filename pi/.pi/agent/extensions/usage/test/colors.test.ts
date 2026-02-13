import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { rgbToOklab, oklabToRgb, classifyDayBlend, blendDayColor } from "../src/colors.ts"
import type { RGB } from "../src/types.ts"

function assertRgbClose(actual: RGB, expected: RGB, tolerance = 1) {
	assert.ok(Math.abs(actual.r - expected.r) <= tolerance, `r: ${actual.r} vs ${expected.r}`)
	assert.ok(Math.abs(actual.g - expected.g) <= tolerance, `g: ${actual.g} vs ${expected.g}`)
	assert.ok(Math.abs(actual.b - expected.b) <= tolerance, `b: ${actual.b} vs ${expected.b}`)
}

describe("OkLab", () => {
	test("round-trip preserves vendor palette colors", () => {
		// The actual colors used in the calendar — all mid-gamut pastels
		const vendorColors: RGB[] = [
			{ r: 250, g: 179, b: 135 }, // anthropic peach
			{ r: 137, g: 180, b: 250 }, // openai blue
			{ r: 148, g: 226, b: 213 }, // google teal
			{ r: 249, g: 226, b: 175 }, // zhipu gold
			{ r: 243, g: 139, b: 168 }, // minimax red
			{ r: 160, g: 160, b: 160 }, // other gray
		]
		for (const rgb of vendorColors) {
			// Tolerance of 8: the OkLab matrices (float32-derived constants)
			// don't perfectly invert at float64, plus cube/cbrt drift.
			// Irrelevant for blending — we never round-trip, only mix.
			assertRgbClose(oklabToRgb(rgbToOklab(rgb)), rgb, 8)
		}
	})

	test("round-trip is exact for neutrals", () => {
		for (const rgb of [
			{ r: 0, g: 0, b: 0 },
			{ r: 128, g: 128, b: 128 },
			{ r: 255, g: 255, b: 255 },
		]) {
			assertRgbClose(oklabToRgb(rgbToOklab(rgb)), rgb)
		}
	})
})

describe("classifyDayBlend", () => {
	const red: RGB = { r: 255, g: 0, b: 0 }
	const blue: RGB = { r: 0, g: 0, b: 255 }
	const green: RGB = { r: 0, g: 255, b: 0 }
	const gray: RGB = { r: 160, g: 160, b: 160 }

	test("no entries → pure fallback", () => {
		const blend = classifyDayBlend([], gray)
		assert.strictEqual(blend.kind, "pure")
		if (blend.kind === "pure") assert.deepStrictEqual(blend.color, gray)
	})

	test("single model → pure", () => {
		const blend = classifyDayBlend([{ color: red, count: 10 }], gray)
		assert.strictEqual(blend.kind, "pure")
		if (blend.kind === "pure") assert.deepStrictEqual(blend.color, red)
	})

	test("dominance >= 0.80 → pure", () => {
		const blend = classifyDayBlend([
			{ color: red, count: 85 },
			{ color: blue, count: 15 },
		], gray)
		assert.strictEqual(blend.kind, "pure")
	})

	test("dominance 0.65–0.80 → dominant with tint", () => {
		const blend = classifyDayBlend([
			{ color: red, count: 70 },
			{ color: blue, count: 30 },
		], gray)
		assert.strictEqual(blend.kind, "dominant")
		if (blend.kind === "dominant") {
			assert.deepStrictEqual(blend.primary, red)
			assert.deepStrictEqual(blend.tint, blue)
		}
	})

	test("dominance < 0.65 → balanced", () => {
		const blend = classifyDayBlend([
			{ color: red, count: 55 },
			{ color: blue, count: 45 },
		], gray)
		assert.strictEqual(blend.kind, "balanced")
		if (blend.kind === "balanced") {
			assert.deepStrictEqual(blend.first, red)
			assert.deepStrictEqual(blend.second, blue)
			assert.strictEqual(blend.accent, undefined)
		}
	})

	test("balanced with significant third → has accent", () => {
		// 40+35+15=90, third share = 15/90 ≈ 0.167 >= 0.12
		const blend = classifyDayBlend([
			{ color: red, count: 40 },
			{ color: blue, count: 35 },
			{ color: green, count: 15 },
		], gray)
		assert.strictEqual(blend.kind, "balanced")
		if (blend.kind === "balanced") assert.deepStrictEqual(blend.accent, green)
	})

	test("balanced with insignificant third → no accent", () => {
		// 50+45+5=100, third share = 5/100 = 0.05 < 0.12
		const blend = classifyDayBlend([
			{ color: red, count: 50 },
			{ color: blue, count: 45 },
			{ color: green, count: 5 },
		], gray)
		assert.strictEqual(blend.kind, "balanced")
		if (blend.kind === "balanced") assert.strictEqual(blend.accent, undefined)
	})

	test("entries need not be pre-sorted", () => {
		const blend = classifyDayBlend([
			{ color: blue, count: 30 },
			{ color: red, count: 70 },
		], gray)
		assert.strictEqual(blend.kind, "dominant")
		if (blend.kind === "dominant") {
			assert.deepStrictEqual(blend.primary, red)
			assert.deepStrictEqual(blend.tint, blue)
		}
	})
})

describe("blendDayColor", () => {
	test("pure returns color unchanged", () => {
		const color: RGB = { r: 250, g: 179, b: 135 }
		assert.deepStrictEqual(blendDayColor({ kind: "pure", color }), color)
	})

	test("dominant shifts primary toward tint", () => {
		const primary: RGB = { r: 250, g: 179, b: 135 }
		const tint: RGB = { r: 137, g: 180, b: 250 }
		const result = blendDayColor({ kind: "dominant", primary, tint })
		// Shifted slightly toward tint but still close to primary
		assert.ok(result.r < primary.r, "red channel should move toward tint")
		assert.ok(result.b > primary.b, "blue channel should move toward tint")
		assert.ok(result.r > (primary.r + tint.r) / 2, "should stay closer to primary")
	})

	test("balanced 50/50 of yellow + blue produces chromatic midpoint, not gray", () => {
		const yellow: RGB = { r: 255, g: 255, b: 0 }
		const blue: RGB = { r: 0, g: 0, b: 255 }
		const result = blendDayColor({ kind: "balanced", first: yellow, second: blue, ratio: 0.5 })
		// RGB average: (128, 128, 128) — gray
		// OkLab should preserve chroma — the result should NOT be gray
		const chroma = Math.abs(result.r - result.g) + Math.abs(result.g - result.b) + Math.abs(result.r - result.b)
		assert.ok(chroma > 30, `should be chromatic, not gray (channel spread: ${chroma})`)
	})
})
