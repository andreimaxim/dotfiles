import { CARD_BAR_WIDTH } from "./constants.ts";
import type {
  CardMessage,
  CardTheme,
  CodexUsagePayload,
  LimitEntry,
  RateLimitWindow,
  UsageCredits,
  UsageMessageDetails,
  UsageMessageMeta,
  UsageMode,
  UsageTone,
} from "./types.ts";

export function createUsageCardComponent(
  message: CardMessage,
  expanded: boolean,
  theme: CardTheme,
) {
  return {
    invalidate() {},
    render(width: number) {
      return renderUsageMessageLines(message, expanded, theme, Math.max(1, width));
    },
  };
}

export function renderUsageMessageLines(
  message: CardMessage,
  expanded: boolean,
  theme: CardTheme,
  width: number,
): string[] {
  const details = parseUsageMessageDetails(message.details);

  if (!details) {
    return renderErrorCard(theme, width, "Missing usage payload");
  }

  if (!details.ok) {
    return renderErrorCard(theme, width, details.error || message.content);
  }

  if (details.mode === "raw" || details.mode === "json") {
    return renderRawPayload(theme, width, details.payload, details.meta, expanded);
  }

  return renderSuccessCard(theme, width, details.payload, details.meta, expanded);
}

export function renderSuccessCard(
  theme: CardTheme,
  width: number,
  payload: CodexUsagePayload,
  meta: UsageMessageMeta | undefined,
  expanded: boolean,
): string[] {
  const limits = collectPrimaryLimitEntries(payload);
  const lines = [renderHorizontalRule(theme, width)];

  if (limits.length === 0) {
    lines.push(...wrapStyledText(theme, "dim", "No limit data available.", width));
  } else {
    const labelWidth = Math.max(...limits.map((limit) => limit.label.length));
    for (const limit of limits) {
      lines.push(...renderLimitLines(theme, width, labelWidth, limit));
    }
  }

  if (expanded) {
    lines.push("");
    lines.push(
      ...wrapStyledText(
        theme,
        "dim",
        `Plan: ${formatPlanType(payload.plan_type)} · Credits: ${formatCredits(payload.credits) ?? "Unknown"}`,
        width,
      ),
    );

    for (const limit of collectAdditionalLimitEntries(payload)) {
      lines.push(
        ...wrapStyledText(
          theme,
          "dim",
          `${limit.label}: ${limit.remaining}% left${limit.resetCompact ? ` (resets ${limit.resetCompact})` : ""}`,
          width,
        ),
      );
    }

    if (meta) {
      const fetchedAt = formatMetaTimestamp(meta);
      if (fetchedAt) {
        lines.push(...wrapStyledText(theme, "dim", `Fetched: ${fetchedAt}`, width));
      }
      lines.push(...wrapStyledText(theme, "dim", `Endpoint: ${meta.url}`, width));
    }

    lines.push("");
    lines.push(...wrapStyledText(theme, "dim", "Raw JSON:", width));
    lines.push(...wrapText(JSON.stringify(payload, null, 2), width));
  }

  lines.push(renderHorizontalRule(theme, width));
  return lines;
}

export function renderRawPayload(
  theme: CardTheme,
  width: number,
  payload: CodexUsagePayload,
  meta: UsageMessageMeta | undefined,
  expanded: boolean,
): string[] {
  const lines = wrapText(JSON.stringify(payload, null, 2), width);

  if (!expanded || !meta) {
    return lines;
  }

  const fetchedAt = formatMetaTimestamp(meta);
  if (fetchedAt) {
    lines.push("");
    lines.push(...wrapStyledText(theme, "dim", `Fetched: ${fetchedAt}`, width));
  }
  lines.push(...wrapStyledText(theme, "dim", `Endpoint: ${meta.url}`, width));
  return lines;
}

export function renderErrorCard(theme: CardTheme, width: number, message: string): string[] {
  return [
    renderHorizontalRule(theme, width),
    ...wrapStyledText(theme, "error", message || "OpenAI Codex usage request failed", width),
    renderHorizontalRule(theme, width),
  ];
}

export function collectPrimaryLimitEntries(payload: CodexUsagePayload): LimitEntry[] {
  const entries: LimitEntry[] = [];
  const primary = payload.rate_limit?.primary_window;
  const secondary = payload.rate_limit?.secondary_window;

  if (primary) {
    entries.push(createLimitEntry(windowLabel(primary, "primary"), primary));
  }
  if (secondary) {
    entries.push(createLimitEntry(windowLabel(secondary, "secondary"), secondary));
  }

  return entries;
}

export function collectAdditionalLimitEntries(payload: CodexUsagePayload): LimitEntry[] {
  const entries: LimitEntry[] = [];
  const additional = Array.isArray(payload.additional_rate_limits)
    ? payload.additional_rate_limits
    : [];

  for (const limit of additional) {
    if (!limit) continue;

    const bucket = limit.limit_name || limit.metered_feature || "Additional limit";
    const additionalPrimary = limit.rate_limit?.primary_window;
    const additionalSecondary = limit.rate_limit?.secondary_window;

    if (additionalPrimary) {
      entries.push(
        createLimitEntry(
          `${bucket} · ${windowLabel(additionalPrimary, "primary")}`,
          additionalPrimary,
        ),
      );
    }
    if (additionalSecondary) {
      entries.push(
        createLimitEntry(
          `${bucket} · ${windowLabel(additionalSecondary, "secondary")}`,
          additionalSecondary,
        ),
      );
    }
  }

  return entries;
}

export function createLimitEntry(label: string, window: RateLimitWindow): LimitEntry {
  const used = clampPercent(toNumber(window.used_percent) ?? 0);
  const remaining = clampPercent(100 - used);

  return {
    label,
    used,
    remaining,
    tone: toneForRemaining(remaining),
    resetsAt: window.reset_at ? formatTimestamp(toTimestampMs(window.reset_at)) : null,
    resetCompact: window.reset_at
      ? formatCompactResetTimestamp(toTimestampMs(window.reset_at))
      : null,
  };
}

export function windowLabel(
  window: RateLimitWindow,
  fallbackKind: "primary" | "secondary",
): string {
  const seconds = toNumber(window.limit_window_seconds);
  if (seconds === null || seconds <= 0) {
    return fallbackKind === "secondary" ? "Weekly limit" : "5h limit";
  }
  if (seconds === 5 * 60 * 60) return "5h limit";
  if (seconds === 7 * 24 * 60 * 60) return "Weekly limit";
  if (seconds === 30 * 24 * 60 * 60 || seconds === 31 * 24 * 60 * 60) {
    return "Monthly limit";
  }
  return `${describeWindow(seconds)} limit`;
}

export function parseMode(args: string): UsageMode {
  const value = args.trim().toLowerCase();
  if (value === "raw" || value === "json") return value;
  return "summary";
}

export function formatCredits(credits: UsageCredits | null | undefined): string | null {
  if (!credits) return null;
  if (credits.unlimited) return "Unlimited";
  if (
    credits.has_credits &&
    credits.balance !== undefined &&
    credits.balance !== null &&
    credits.balance !== ""
  ) {
    return String(credits.balance);
  }
  if (credits.has_credits) return "Tracked";
  return "Not enabled";
}

export function describeWindow(seconds: number): string {
  const totalSeconds = toNumber(seconds);
  if (totalSeconds === null || totalSeconds <= 0) return "unknown";

  const minutes = Math.round(totalSeconds / 60);
  if (minutes % (60 * 24 * 7) === 0) {
    const weeks = minutes / (60 * 24 * 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (minutes % (60 * 24) === 0) {
    const days = minutes / (60 * 24);
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function formatTimestamp(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function formatCompactResetTimestamp(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const now = new Date();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return time;
  }

  const month = date.toLocaleString([], { month: "short" });
  return `${time} on ${date.getDate()} ${month}`;
}

export function titleCase(value: string): string {
  return String(value)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => {
      if (part.toLowerCase() === "chatgpt") return "ChatGPT";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function wrapText(text: string, width: number): string[] {
  const normalizedWidth = Math.max(1, width);
  const lines: string[] = [];

  for (const sourceLine of String(text).split("\n")) {
    if (sourceLine.length === 0) {
      lines.push("");
      continue;
    }

    let remaining = sourceLine;
    while (remaining.length > normalizedWidth) {
      let splitAt = remaining.lastIndexOf(" ", normalizedWidth);
      if (splitAt <= 0 || splitAt < Math.floor(normalizedWidth / 2)) {
        splitAt = normalizedWidth;
      }
      lines.push(remaining.slice(0, splitAt).trimEnd());
      remaining = remaining.slice(splitAt).trimStart();
    }

    lines.push(remaining);
  }

  return lines;
}

function renderHorizontalRule(theme: CardTheme, width: number): string {
  return theme.fg("dim", "─".repeat(Math.max(1, width)));
}

function renderLimitLines(
  theme: CardTheme,
  width: number,
  labelWidth: number,
  limit: LimitEntry,
): string[] {
  const label = `${limit.label}:`.padEnd(labelWidth + 1);
  const suffix = `${limit.remaining}% left${limit.resetCompact ? ` (resets ${limit.resetCompact})` : ""}`;
  const barWidth = computeBarWidth(width, label.length, suffix.length);

  if (barWidth <= 0) {
    return [...wrapText(label, width), ...wrapStyledText(theme, limit.tone, suffix, width)];
  }

  const bar = renderProgressBar(theme, limit.remaining, limit.tone, barWidth);
  const plainLine = `${label} [${"█".repeat(Math.round((clampPercent(limit.remaining) / 100) * barWidth))}${"░".repeat(Math.max(0, barWidth - Math.round((clampPercent(limit.remaining) / 100) * barWidth)))}] ${suffix}`;

  if (plainLine.length > width) {
    return [...wrapText(label, width), bar, ...wrapStyledText(theme, limit.tone, suffix, width)];
  }

  return [`${label} ${bar} ${theme.fg(limit.tone, suffix)}`];
}

function renderProgressBar(
  theme: CardTheme,
  percentRemaining: number,
  tone: UsageTone,
  width: number,
): string {
  const clamped = clampPercent(percentRemaining);
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);
  return `[${theme.fg(tone, "█".repeat(filled))}${theme.fg("dim", "░".repeat(empty))}]`;
}

function computeBarWidth(width: number, labelLength: number, suffixLength: number): number {
  const available = width - labelLength - suffixLength - 4;
  return Math.max(0, Math.min(CARD_BAR_WIDTH, available));
}

function toneForRemaining(percentRemaining: number): UsageTone {
  if (percentRemaining <= 25) return "error";
  if (percentRemaining <= 50) return "warning";
  return "success";
}

function toNumber(value: number | string | null | undefined): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function wrapStyledText(theme: CardTheme, color: string, text: string, width: number): string[] {
  return wrapText(text, width).map((line) => theme.fg(color, line));
}

function toTimestampMs(value: number | string | null | undefined): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric * 1000 : Number.NaN;
}

function formatPlanType(planType: string | null | undefined): string {
  return titleCase(planType || "unknown");
}

function formatMetaTimestamp(meta: UsageMessageMeta): string | null {
  if (typeof meta.fetchedAtMs === "number") {
    return formatTimestamp(meta.fetchedAtMs);
  }
  if (typeof meta.fetchedAt === "string" && meta.fetchedAt.length > 0) {
    return meta.fetchedAt;
  }
  return null;
}

function parseUsageMessageDetails(details: unknown): UsageMessageDetails | null {
  if (!details || typeof details !== "object") return null;
  const record = details as Partial<UsageMessageDetails>;
  if (record.ok === true && record.payload && typeof record.payload === "object") {
    return {
      ok: true,
      renderVersion: typeof record.renderVersion === "number" ? record.renderVersion : 0,
      mode: normalizeMode(record.mode),
      payload: record.payload as CodexUsagePayload,
      meta: record.meta,
    };
  }
  if (record.ok === false && typeof record.error === "string") {
    return { ok: false, error: record.error };
  }
  return null;
}

function normalizeMode(mode: UsageMode | undefined): UsageMode {
  return mode === "raw" || mode === "json" ? mode : "summary";
}
