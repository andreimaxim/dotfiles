import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildUsageUrl,
  extractAccountId,
  fetchCodexUsage,
  normalizeBaseUrl,
  parseJson,
  resolveToken,
} from "../src/api.ts";
import type { ApiKeyContext } from "../src/types.ts";

function createContext(token?: string): ApiKeyContext {
  return {
    modelRegistry: {
      getApiKeyForProvider: async () => token,
    },
  };
}

function createJwt(accountId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      "https://api.openai.com/auth": {
        chatgpt_account_id: accountId,
      },
    }),
    "signature",
  ].join(".");
}

describe("api helpers", () => {
  test("normalizeBaseUrl appends /backend-api for chatgpt.com", () => {
    assert.strictEqual(normalizeBaseUrl("https://chatgpt.com"), "https://chatgpt.com/backend-api");
    assert.strictEqual(
      normalizeBaseUrl("https://chat.openai.com/"),
      "https://chat.openai.com/backend-api",
    );
    assert.strictEqual(
      normalizeBaseUrl("https://example.com/custom"),
      "https://example.com/custom",
    );
  });

  test("buildUsageUrl mirrors Codex backend selection", () => {
    assert.strictEqual(
      buildUsageUrl("https://chatgpt.com/backend-api"),
      "https://chatgpt.com/backend-api/wham/usage",
    );
    assert.strictEqual(buildUsageUrl("https://example.com"), "https://example.com/api/codex/usage");
  });

  test("extractAccountId reads chatgpt_account_id from JWT", () => {
    assert.strictEqual(extractAccountId(createJwt("acct_123")), "acct_123");
  });

  test("parseJson rejects invalid JSON", () => {
    assert.throws(
      () => parseJson("not json", "https://example.com"),
      /Failed to decode JSON from https:\/\/example.com/,
    );
  });

  test("resolveToken prefers explicit environment override", async () => {
    const token = await resolveToken(createContext("registry-token"), {
      OPENAI_CODEX_USAGE_TOKEN: "env-token",
    });

    assert.strictEqual(token, "env-token");
  });
});

describe("fetchCodexUsage", () => {
  test("uses environment overrides for token, account id, and base url", async () => {
    let requestedUrl = "";
    let requestedHeaders: Headers | undefined;

    const result = await fetchCodexUsage(createContext(), {
      env: {
        OPENAI_CODEX_USAGE_TOKEN: "env-token",
        OPENAI_CODEX_USAGE_ACCOUNT_ID: "acct_from_env",
        OPENAI_CODEX_USAGE_BASE_URL: "https://example.com",
      },
      now: () => 1234,
      fetchImpl: async (input, init) => {
        requestedUrl = String(input);
        requestedHeaders =
          init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
        return new Response(JSON.stringify({ plan_type: "chatgpt_plus" }), {
          status: 200,
          statusText: "OK",
        });
      },
    });

    assert.strictEqual(requestedUrl, "https://example.com/api/codex/usage");
    assert.strictEqual(requestedHeaders?.get("authorization"), "Bearer env-token");
    assert.strictEqual(requestedHeaders?.get("chatgpt-account-id"), "acct_from_env");
    assert.strictEqual(result.fetchedAt, 1234);
    assert.strictEqual(result.payload.plan_type, "chatgpt_plus");
  });

  test("falls back to Pi provider token and extracts account id from JWT", async () => {
    const token = createJwt("acct_from_jwt");
    let requestedHeaders: Headers | undefined;

    await fetchCodexUsage(createContext(token), {
      now: () => 42,
      fetchImpl: async (_input, init) => {
        requestedHeaders =
          init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
        return new Response(JSON.stringify({ plan_type: "chatgpt_pro" }), {
          status: 200,
          statusText: "OK",
        });
      },
    });

    assert.strictEqual(requestedHeaders?.get("authorization"), `Bearer ${token}`);
    assert.strictEqual(requestedHeaders?.get("chatgpt-account-id"), "acct_from_jwt");
  });

  test("includes API error details in thrown message", async () => {
    await assert.rejects(
      () =>
        fetchCodexUsage(createContext(), {
          env: {
            OPENAI_CODEX_USAGE_TOKEN: "env-token",
            OPENAI_CODEX_USAGE_ACCOUNT_ID: "acct_from_env",
          },
          fetchImpl: async () =>
            new Response(JSON.stringify({ error: { message: "bad token" } }), {
              status: 401,
              statusText: "Unauthorized",
            }),
        }),
      /OpenAI usage request failed \(401 Unauthorized\): bad token/,
    );
  });
});
