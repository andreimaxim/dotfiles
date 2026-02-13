# Usage Extension for Pi

This is a **Pi coding agent extension** — a TypeScript module that extends [Pi](https://github.com/badlogic/pi-mono), a minimal terminal coding harness by Anthropic.

## What This Extension Does

Registers the `/usage` command, which displays an interactive TUI showing:

- A **calendar heatmap** of model usage per day (color-coded by model).
- A **provider cost table** with token counts, message counts, and costs.
- Switchable time ranges: **7d / 30d / 90d** via arrow keys.

It scans session files from the Pi agent directory (`~/.pi/agent/sessions/`), parses assistant messages for cost/token metadata, and renders the results using Pi's TUI component system.

## Project Structure

| File                    | Purpose                                                      |
|-------------------------|--------------------------------------------------------------|
| `index.ts`              | Entry point. Registers the `/usage` command.                 |
| `usage-component.ts`    | Main TUI component (heatmap + table rendering, key handling) |
| `session-collector.ts`  | Scans and parses session JSON files for usage data           |
| `stats.ts`              | Computes aggregate statistics from session data              |
| `provider-breakdown.ts` | Groups costs/tokens by provider                              |
| `provider-table.ts`     | Renders the provider cost table as styled text               |
| `provider-costs.ts`     | Model cost lookup                                            |
| `model-families.ts`     | Maps model IDs to display names and family groups            |
| `colors.ts`             | RGB color mixing, ANSI helpers, theme-aware colorization     |
| `formatting.ts`         | Number/currency formatting utilities                         |
| `time.ts`               | Date arithmetic (local midnight, cutoff, period helpers)     |
| `loader-utils.ts`       | Helper for updating `BorderedLoader` messages                |
| `types.ts`              | Shared type definitions                                      |

## Pi Documentation

All Pi documentation lives inside the installed npm package:

| Topic              | Path                                                                                                                          |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------|
| **Main README**    | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/README.md`           |
| **Extensions**     | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/extensions.md`  |
| **TUI Components** | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/tui.md`         |
| **Themes**         | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/themes.md`      |
| **Skills**         | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/skills.md`      |
| **Sessions**       | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/session.md`     |
| **All docs**       | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/`               |
| **Examples**       | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/examples/extensions/`|

**Always read `extensions.md` before modifying this code.** It covers the full extension API: events, tools, commands, UI methods, state management, and rendering. Cross-reference `tui.md` when working on components.

## How Pi Extensions Work

An extension is a TypeScript file (or directory with `index.ts`) that exports a default function receiving `ExtensionAPI`:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => { /* ... */ });
  pi.registerCommand("name", { description: "...", handler: async (args, ctx) => { /* ... */ } });
  pi.registerTool({ name: "tool_name", /* ... */ });
}
```

Extensions are auto-discovered from:
- `~/.pi/agent/extensions/*.ts` or `~/.pi/agent/extensions/*/index.ts` — global
- `.pi/extensions/*.ts` or `.pi/extensions/*/index.ts` — project-local

TypeScript works without compilation (loaded via [jiti](https://github.com/unjs/jiti)). Hot-reload with `/reload`.

## Key APIs Used by This Extension

- **`pi.registerCommand()`** — Registers the `/usage` slash command.
- **`ctx.ui.custom()`** — Renders custom TUI components (the loader and the usage view). Temporarily replaces the editor until `done()` is called.
- **`BorderedLoader`** — Built-in component for async operations with a cancel button.
- **`ctx.hasUI`** — Guards against running in non-interactive modes (print, JSON).
- **`ctx.ui.notify()`** — Shows toast notifications.
- **`getAgentDir()`** — Returns the Pi agent directory (`~/.pi/agent/`) for locating session files.
- **Theme API** (`theme.fg()`, `theme.bold()`) — All text styling goes through the theme for consistency.
- **TUI primitives** (`Text`, `Component`, `matchesKey`, `visibleWidth`, `truncateToWidth`) — from `@mariozechner/pi-tui`.

## Guidelines for Modifying This Extension

1. **Read the docs first.** Load `extensions.md` and `tui.md` before making changes.
2. **Use the theme for all colors.** Never hardcode ANSI escapes for foreground text — use `theme.fg("accent", ...)`, `theme.fg("muted", ...)`, etc. The exception is background/RGB mixing in `colors.ts`, which needs raw ANSI for the heatmap cells.
3. **Keep output truncated.** If adding tool output, use Pi's `truncateHead`/`truncateTail` utilities.
4. **Handle cancellation.** All async work should respect `AbortSignal` — see `session-collector.ts` for the pattern.
5. **Test interactively.** Run `pi` and type `/usage` to verify changes. Use `/reload` to pick up modifications without restarting.
