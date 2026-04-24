# pi-codex-fast

A [Pi](https://github.com/badlogic/pi-mono) extension that adds fast-tier aliases for OpenAI Codex models.

## Features

- **Selectable fast aliases** — adds `openai-codex/gpt-5.4-fast` and `openai-codex/gpt-5.5-fast` to Pi's model list
- **Reuses base model metadata** — copies the existing model settings instead of hardcoding separate provider definitions
- **Priority routing** — rewrites outgoing requests with `service_tier: "priority"`

## Install

```bash
pi install npm:@andreimaxim/pi-codex-fast
```

Or try it without installing:

```bash
pi -e npm:@andreimaxim/pi-codex-fast
```

## Usage

Open Pi's model picker and select:

```text
openai-codex / gpt-5.4-fast
openai-codex / gpt-5.5-fast
```

The extension only activates for base models that are available. If `gpt-5.4` exists, you get `gpt-5.4-fast`. If `gpt-5.5` exists, you get `gpt-5.5-fast`.

## How it works

On load and on `session_start`, the extension looks up the existing `openai-codex` provider models and re-registers the provider with extra derived model entries (`gpt-5.4-fast`, `gpt-5.5-fast`).

When a fast alias is selected, the extension intercepts the provider payload in `before_provider_request` and rewrites it to:

- `model: "<base-model>"` (e.g., `gpt-5.4` or `gpt-5.5`)
- `service_tier: "priority"`

This keeps the fast tiers as separate selectable models in Pi without replacing the standard entries.

## Development

```bash
npm test          # run tests
npm run check     # lint + format check
```

Use `/reload` inside Pi to pick up changes without restarting.

## License

MIT
