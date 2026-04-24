import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { patchPayload } from "../src/payload.ts";

describe("patchPayload", () => {
  test("rewrites gpt-5.4-fast to gpt-5.4 with priority tier", () => {
    assert.deepEqual(patchPayload({ model: "gpt-5.4-fast", stream: true }, "gpt-5.4-fast"), {
      model: "gpt-5.4",
      stream: true,
      service_tier: "priority",
    });
  });

  test("rewrites gpt-5.5-fast to gpt-5.5 with priority tier", () => {
    assert.deepEqual(patchPayload({ model: "gpt-5.5-fast", stream: true }, "gpt-5.5-fast"), {
      model: "gpt-5.5",
      stream: true,
      service_tier: "priority",
    });
  });

  test("returns undefined for unknown fast model ids", () => {
    assert.equal(patchPayload({ model: "unknown", stream: true }, "unknown"), undefined);
  });

  test("returns undefined for non-object payloads", () => {
    assert.equal(patchPayload(null, "gpt-5.4-fast"), undefined);
    assert.equal(patchPayload("nope", "gpt-5.4-fast"), undefined);
    assert.equal(patchPayload([1, 2, 3], "gpt-5.4-fast"), undefined);
  });
});
