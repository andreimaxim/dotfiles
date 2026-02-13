import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { parseModel } from "../src/model.ts"

function assertModel(rawId: string, vendor: string, family: string) {
  const result = parseModel(rawId)
  assert.strictEqual(result.vendor, vendor)
  assert.strictEqual(result.family, family)
}

describe("parseModel", () => {
  describe("anthropic", () => {
    test("claude-opus-4-6", () => assertModel("claude-opus-4-6", "anthropic", "claude-opus"))
    test("claude-opus-4.5", () => assertModel("claude-opus-4.5", "anthropic", "claude-opus"))
    test("claude-3-5-sonnet-20241022", () => assertModel("claude-3-5-sonnet-20241022", "anthropic", "claude-sonnet"))
    test("claude-3-5-haiku-20241022", () => assertModel("claude-3-5-haiku-20241022", "anthropic", "claude-haiku"))
  })

  describe("openai", () => {
    test("gpt-5.2-codex", () => assertModel("gpt-5.2-codex", "openai", "gpt-5-codex"))
    test("gpt-5.1-codex-mini", () => assertModel("gpt-5.1-codex-mini", "openai", "gpt-5-codex-mini"))
    test("gpt-5.1-codex-max strips reasoning effort", () => assertModel("gpt-5.1-codex-max", "openai", "gpt-5-codex"))
    test("gpt-5.3-codex-spark", () => assertModel("gpt-5.3-codex-spark", "openai", "gpt-5-codex-spark"))
    test("gpt-5-chat-latest strips reasoning effort and alias", () => assertModel("gpt-5-chat-latest", "openai", "gpt-5"))
    test("o3-mini stays as-is", () => assertModel("o3-mini", "openai", "o3-mini"))
    test("codex-mini-latest resolves alias", () => assertModel("codex-mini-latest", "openai", "gpt-5-codex-mini"))
    test("codex-mini resolves alias", () => assertModel("codex-mini", "openai", "gpt-5-codex-mini"))
  })

  describe("google", () => {
    test("gemini-3-pro-preview", () => assertModel("gemini-3-pro-preview", "google", "gemini-pro"))
    test("gemini-3-flash", () => assertModel("gemini-3-flash", "google", "gemini-flash"))
  })

  describe("zhipu", () => {
    test("glm-4.7", () => assertModel("glm-4.7", "zhipu", "glm"))
  })

  describe("kimi", () => {
    test("kimi-k2.5-free", () => assertModel("kimi-k2.5-free", "kimi", "kimi"))
  })

  describe("minimax", () => {
    test("minimax-m2.5-free", () => assertModel("minimax-m2.5-free", "minimax", "minimax"))
  })

  describe("qwen", () => {
    test("qwen3-coder", () => assertModel("qwen3-coder", "qwen", "qwen-coder"))
  })

  describe("xai", () => {
    test("grok-code-fast-1", () => assertModel("grok-code-fast-1", "xai", "grok-code"))
  })

  describe("unknown", () => {
    test("unrecognized model returns cleaned id", () => assertModel("some-random-model-3.5-preview", "unknown", "some-random-model-3.5"))
    test("empty string", () => assertModel("", "unknown", ""))
  })

  describe("color", () => {
    test("known vendors get a non-gray color", () => {
      const gray = { r: 160, g: 160, b: 160 }
      for (const id of ["claude-opus-4-6", "gpt-5.2-codex", "gemini-3-flash", "glm-4.7", "minimax-m2.5-free"]) {
        const { color } = parseModel(id)
        assert.notDeepStrictEqual(color, gray, `${id} should have a brand color`)
      }
    })

    test("same vendor always gets the same color", () => {
      assert.deepStrictEqual(parseModel("claude-opus-4-6").color, parseModel("claude-3-5-sonnet-20241022").color)
      assert.deepStrictEqual(parseModel("gpt-5.2-codex").color, parseModel("o3-mini").color)
    })

    test("unknown vendor gets gray", () => {
      assert.deepStrictEqual(parseModel("some-random-model").color, { r: 160, g: 160, b: 160 })
    })
  })
})
