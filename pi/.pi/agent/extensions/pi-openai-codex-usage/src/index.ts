import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { fetchCodexUsage } from "./api.ts";
import { MESSAGE_TYPE, STATUS_KEY } from "./constants.ts";
import { createUsageCardComponent, parseMode } from "./renderer.ts";

export default function openAICodexUsageExtension(pi: ExtensionAPI) {
  pi.registerMessageRenderer(MESSAGE_TYPE, (message, { expanded }, theme) =>
    createUsageCardComponent(message, expanded, theme),
  );

  pi.registerCommand("codex-usage", {
    description: "Fetch OpenAI Codex subscription usage on demand",
    getArgumentCompletions: (prefix) => {
      const options = ["summary", "raw", "json"];
      const matches = options.filter((option) => option.startsWith(prefix.trim()));
      return matches.length > 0 ? matches.map((value) => ({ value, label: value })) : null;
    },
    handler: async (args, ctx) => {
      const mode = parseMode(args);
      ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", "Fetching OpenAI Codex usage…"));

      try {
        const result = await fetchCodexUsage(ctx);

        pi.sendMessage({
          customType: MESSAGE_TYPE,
          content:
            mode === "summary" ? "OpenAI Codex usage" : JSON.stringify(result.payload, null, 2),
          display: true,
          details: {
            ok: true,
            renderVersion: 4,
            mode,
            payload: result.payload,
            meta: {
              url: result.url,
              fetchedAtMs: result.fetchedAt,
            },
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pi.sendMessage({
          customType: MESSAGE_TYPE,
          content: message,
          display: true,
          details: {
            ok: false,
            error: message,
          },
        });
      } finally {
        ctx.ui.setStatus(STATUS_KEY, undefined);
      }
    },
  });
}
