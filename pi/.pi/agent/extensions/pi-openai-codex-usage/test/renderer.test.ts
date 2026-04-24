import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  collectAdditionalLimitEntries,
  collectPrimaryLimitEntries,
  describeWindow,
  formatCredits,
  parseMode,
  renderUsageMessageLines,
  windowLabel,
} from "../src/renderer.ts";
import type { CardTheme, CodexUsagePayload } from "../src/types.ts";

const theme: CardTheme = {
  fg: (_color, text) => text,
};

function createPayload(): CodexUsagePayload {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    plan_type: "chatgpt_plus",
    credits: {
      has_credits: true,
      balance: 0,
    },
    rate_limit: {
      primary_window: {
        used_percent: 25,
        limit_window_seconds: 5 * 60 * 60,
        reset_at: nowSeconds + 60 * 60,
      },
      secondary_window: {
        used_percent: 80,
        limit_window_seconds: 7 * 24 * 60 * 60,
        reset_at: nowSeconds + 2 * 24 * 60 * 60,
      },
    },
    additional_rate_limits: [
      {
        limit_name: "GPT-5",
        rate_limit: {
          primary_window: {
            used_percent: 55,
            limit_window_seconds: 30 * 24 * 60 * 60,
            reset_at: nowSeconds + 10 * 24 * 60 * 60,
          },
        },
      },
    ],
  };
}

describe("renderer helpers", () => {
  test("parseMode keeps summary as the default", () => {
    assert.strictEqual(parseMode(""), "summary");
    assert.strictEqual(parseMode("summary"), "summary");
    assert.strictEqual(parseMode("raw"), "raw");
    assert.strictEqual(parseMode("json"), "json");
  });

  test("collectPrimaryLimitEntries derives labels and tones", () => {
    const [primary, secondary] = collectPrimaryLimitEntries(createPayload());

    assert.strictEqual(primary?.label, "5h limit");
    assert.strictEqual(primary?.remaining, 75);
    assert.strictEqual(primary?.tone, "success");
    assert.strictEqual(secondary?.label, "Weekly limit");
    assert.strictEqual(secondary?.remaining, 20);
    assert.strictEqual(secondary?.tone, "error");
  });

  test("collectAdditionalLimitEntries includes per-bucket labels", () => {
    const [entry] = collectAdditionalLimitEntries(createPayload());

    assert.strictEqual(entry?.label, "GPT-5 · Monthly limit");
    assert.strictEqual(entry?.remaining, 45);
    assert.strictEqual(entry?.tone, "warning");
  });

  test("windowLabel and describeWindow format known windows", () => {
    assert.strictEqual(
      windowLabel({ limit_window_seconds: 2 * 60 * 60 }, "primary"),
      "2 hours limit",
    );
    assert.strictEqual(describeWindow(90 * 60), "90 minutes");
  });

  test("formatCredits keeps zero balances visible", () => {
    assert.strictEqual(formatCredits({ has_credits: true, balance: 0 }), "0");
    assert.strictEqual(formatCredits({ unlimited: true }), "Unlimited");
  });
});

describe("renderUsageMessageLines", () => {
  test("renders the summary card for summary mode", () => {
    const payload = createPayload();
    const lines = renderUsageMessageLines(
      {
        content: "OpenAI Codex usage",
        details: {
          ok: true,
          renderVersion: 4,
          mode: "summary",
          payload,
          meta: {
            url: "https://chatgpt.com/backend-api/wham/usage",
            fetchedAtMs: 1234,
          },
        },
      },
      false,
      theme,
      80,
    );

    const rendered = lines.join("\n");
    assert.match(rendered, /5h limit:/);
    assert.match(rendered, /Weekly limit:/);
    assert.doesNotMatch(rendered, /Raw JSON:/);
  });

  test("shows raw JSON when the summary card is expanded", () => {
    const payload = createPayload();
    const lines = renderUsageMessageLines(
      {
        content: "OpenAI Codex usage",
        details: {
          ok: true,
          renderVersion: 4,
          mode: "summary",
          payload,
          meta: {
            url: "https://chatgpt.com/backend-api/wham/usage",
            fetchedAtMs: 1234,
          },
        },
      },
      true,
      theme,
      80,
    );

    const rendered = lines.join("\n");
    assert.match(rendered, /Plan: ChatGPT Plus · Credits: 0/);
    assert.match(rendered, /GPT-5 · Monthly limit: 45% left/);
    assert.match(rendered, /Raw JSON:/);
    assert.match(rendered, /"plan_type": "chatgpt_plus"/);
  });

  test("renders raw mode as JSON instead of the summary card", () => {
    const payload = createPayload();
    const lines = renderUsageMessageLines(
      {
        content: "placeholder",
        details: {
          ok: true,
          renderVersion: 4,
          mode: "raw",
          payload,
          meta: {
            url: "https://example.com/api/codex/usage",
            fetchedAtMs: 1234,
          },
        },
      },
      false,
      theme,
      80,
    );

    const rendered = lines.join("\n");
    assert.match(rendered, /"plan_type": "chatgpt_plus"/);
    assert.doesNotMatch(rendered, /5h limit:/);
  });

  test("renders errors inside the card chrome", () => {
    const lines = renderUsageMessageLines(
      {
        content: "fallback",
        details: {
          ok: false,
          error: "No token found",
        },
      },
      false,
      theme,
      40,
    );

    assert.strictEqual(lines[0], "─".repeat(40));
    assert.match(lines.join("\n"), /No token found/);
    assert.strictEqual(lines.at(-1), "─".repeat(40));
  });
});
