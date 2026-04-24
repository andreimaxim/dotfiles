import { Buffer } from "node:buffer";
import { DEFAULT_BASE_URL, OPENAI_CODEX_PROVIDER } from "./constants.ts";
import type { ApiKeyContext, CodexUsagePayload, UsageResult } from "./types.ts";

export interface FetchCodexUsageOptions {
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: FetchLike;
  now?: () => number;
}

export type FetchLike = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
) => Promise<Response>;

export async function fetchCodexUsage(
  ctx: ApiKeyContext,
  options: FetchCodexUsageOptions = {},
): Promise<UsageResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const baseUrl = normalizeBaseUrl(env.OPENAI_CODEX_USAGE_BASE_URL ?? DEFAULT_BASE_URL);
  const token = await resolveToken(ctx, env);
  const accountId = env.OPENAI_CODEX_USAGE_ACCOUNT_ID || extractAccountId(token);
  const url = buildUsageUrl(baseUrl);
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    "chatgpt-account-id": accountId,
    accept: "application/json",
    "content-type": "application/json",
    "OpenAI-Beta": "responses=experimental",
    "User-Agent": "pi-openai-codex-usage",
  });

  const response = await fetchImpl(url, { method: "GET", headers });
  const body = await response.text();
  const payload = parseJson(body, url);

  if (!response.ok) {
    const suffix =
      typeof payload.error?.message === "string" && payload.error.message.length > 0
        ? `: ${payload.error.message}`
        : "";
    throw new Error(
      `OpenAI usage request failed (${response.status} ${response.statusText})${suffix}`,
    );
  }

  return { url, payload, fetchedAt: now() };
}

export async function resolveToken(
  ctx: ApiKeyContext,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<string> {
  const envToken = env.OPENAI_CODEX_USAGE_TOKEN?.trim();
  if (envToken) return envToken;

  const token = await ctx.modelRegistry.getApiKeyForProvider(OPENAI_CODEX_PROVIDER);
  if (!token) {
    throw new Error(
      "No OpenAI Codex subscription token found. Run /login and select ChatGPT Plus/Pro (Codex), or set OPENAI_CODEX_USAGE_TOKEN.",
    );
  }

  return token;
}

export function normalizeBaseUrl(baseUrl: string): string {
  let normalized = baseUrl.trim().replace(/\/+$/, "");
  if (
    (normalized.startsWith("https://chatgpt.com") ||
      normalized.startsWith("https://chat.openai.com")) &&
    !normalized.includes("/backend-api")
  ) {
    normalized = `${normalized}/backend-api`;
  }
  return normalized;
}

export function buildUsageUrl(baseUrl: string): string {
  return baseUrl.includes("/backend-api") ? `${baseUrl}/wham/usage` : `${baseUrl}/api/codex/usage`;
}

export function extractAccountId(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("invalid JWT");
    const payload = decodeBase64UrlJson(parts[1]);
    const accountId = payload?.["https://api.openai.com/auth"]?.chatgpt_account_id;
    if (!accountId || typeof accountId !== "string") {
      throw new Error("missing chatgpt_account_id");
    }
    return accountId;
  } catch {
    throw new Error(
      "Failed to determine the ChatGPT account id from the OpenAI Codex token. Set OPENAI_CODEX_USAGE_ACCOUNT_ID explicitly.",
    );
  }
}

export function parseJson(text: string, url: string): CodexUsagePayload {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object response");
    }
    return parsed as CodexUsagePayload;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode JSON from ${url}: ${reason}`);
  }
}

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const json = Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("expected JWT payload object");
  }
  return parsed as Record<string, unknown>;
}
