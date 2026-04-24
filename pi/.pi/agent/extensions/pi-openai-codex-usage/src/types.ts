export type UsageMode = "summary" | "raw" | "json";
export type UsageTone = "success" | "warning" | "error";

export interface UsageCredits {
  unlimited?: boolean;
  has_credits?: boolean;
  balance?: string | number | null;
}

export interface RateLimitWindow {
  used_percent?: number | string | null;
  reset_at?: number | string | null;
  limit_window_seconds?: number | string | null;
}

export interface RateLimitGroup {
  primary_window?: RateLimitWindow | null;
  secondary_window?: RateLimitWindow | null;
}

export interface AdditionalRateLimit {
  limit_name?: string | null;
  metered_feature?: string | null;
  rate_limit?: RateLimitGroup | null;
}

export interface CodexUsagePayload {
  plan_type?: string | null;
  credits?: UsageCredits | null;
  rate_limit?: RateLimitGroup | null;
  additional_rate_limits?: AdditionalRateLimit[] | null;
  error?: {
    message?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface LimitEntry {
  label: string;
  used: number;
  remaining: number;
  tone: UsageTone;
  resetsAt: string | null;
  resetCompact: string | null;
}

export interface UsageResult {
  url: string;
  payload: CodexUsagePayload;
  fetchedAt: number;
}

export interface UsageMessageMeta {
  url: string;
  fetchedAtMs?: number;
  fetchedAt?: string;
}

export interface UsageMessageSuccessDetails {
  ok: true;
  renderVersion: number;
  mode: UsageMode;
  payload: CodexUsagePayload;
  meta?: UsageMessageMeta;
}

export interface UsageMessageErrorDetails {
  ok: false;
  error: string;
}

export type UsageMessageDetails = UsageMessageSuccessDetails | UsageMessageErrorDetails;

export interface ApiKeyContext {
  modelRegistry: {
    getApiKeyForProvider(provider: string): Promise<string | null | undefined>;
  };
}

export interface CardTheme {
  fg(color: string, text: string): string;
}

export interface CardMessage {
  content: string;
  details?: unknown;
}
