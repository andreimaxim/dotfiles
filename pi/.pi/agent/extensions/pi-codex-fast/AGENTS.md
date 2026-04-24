# Codex Fast Extension for Pi

This is a **Pi coding agent extension** — a TypeScript module that extends [Pi](https://github.com/badlogic/pi-mono), a minimal terminal coding harness.

## What This Extension Does

Adds fast-tier aliases for OpenAI Codex models (`gpt-5.4-fast`, `gpt-5.5-fast`) as separate selectable models in Pi.

It does two things:

- Re-registers the `openai-codex` provider with extra derived model entries copied from base models
- Rewrites provider payloads for those aliases to use the base model with `service_tier: "priority"`

This lets Pi expose the fast tier as its own model choice without replacing the normal model entries.

## Project Structure

| File                   | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `src/index.ts`         | Entry point. Wires Pi lifecycle hooks and payload patching        |
| `src/model.ts`         | Fast-alias model constants, provider config cloning, registration |
| `src/payload.ts`       | Provider payload rewriting for the fast alias                     |
| `test/index.test.ts`   | Extension wiring tests                                            |
| `test/model.test.ts`   | Provider/model registration tests                                 |
| `test/payload.test.ts` | Payload patch tests                                               |

## Pi Documentation

All Pi documentation lives inside the installed npm package:

| Topic                | Path                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Main README**      | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/README.md`               |
| **Extensions**       | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/extensions.md`      |
| **Pi Packages**      | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/packages.md`        |
| **Models**           | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/models.md`          |
| **Custom Providers** | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/custom-provider.md` |
| **All docs**         | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/docs/`                   |
| **Examples**         | `/var/home/andrei/.local/share/mise/installs/node/24.13.0/lib/node_modules/@mariozechner/pi-coding-agent/examples/extensions/`    |

**Always read `extensions.md`, `packages.md`, `models.md`, and `custom-provider.md` before changing this code.** This extension sits at the boundary between Pi packages, extension lifecycle hooks, provider registration, and model metadata.

## How Pi Extensions Work

An extension is a TypeScript file (or directory with `index.ts`) that exports a default function receiving `ExtensionAPI`:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    /* ... */
  });

  pi.on("before_provider_request", (event, ctx) => {
    /* ... */
  });
}
```

Extensions are auto-discovered from:

- `~/.pi/agent/extensions/*.ts` or `~/.pi/agent/extensions/*/index.ts` — global
- `.pi/extensions/*.ts` or `.pi/extensions/*/index.ts` — project-local

TypeScript works without compilation (loaded via `jiti`). Hot-reload with `/reload`.

## Key APIs Used by This Extension

- **`pi.registerProvider()`** — Re-registers `openai-codex` with the derived `gpt-5.4-fast` model
- **`pi.on("session_start")`** — Refreshes the provider definition using Pi's live `ctx.modelRegistry`
- **`pi.on("before_provider_request")`** — Rewrites the outgoing payload when the fast alias is selected
- **`ctx.modelRegistry.getAll()`** — Reads the active model list after startup/reload
- **`ModelRegistry`** — Builds a bootstrap registry during extension load so the alias is available immediately
- **`AuthStorage.create()` + `getAgentDir()`** — Point bootstrap model loading at Pi's `auth.json` and `models.json`

## Guidelines for Modifying This Extension

1. **Keep the alias derived from the base model.** Do not duplicate a full static provider definition when the metadata can be copied from `gpt-5.4`.
2. **Preserve payload fields.** When patching provider payloads, keep existing fields and only override the model/tier values needed for the alias.
3. **Prefer small, focused modules.** Keep `src/index.ts` as the extension entry point and put provider/model helpers in separate files.
4. **Test both layers.** Unit-test helper functions and the extension wiring separately.
5. **Verify interactively.** Run Pi, use `/model`, select `gpt-5.4-fast`, and use `/reload` while iterating.
