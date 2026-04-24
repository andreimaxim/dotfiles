# pi-openai-codex-usage

A [Pi](https://github.com/badlogic/pi-mono) extension that adds `/codex-usage`, a command that fetches OpenAI Codex subscription usage on demand.

By default it uses Pi's `openai-codex` login state, so if you already ran `/login` and selected **ChatGPT Plus/Pro (Codex)**, the command should work without extra setup.

## What it does

- registers a Pi command: `/codex-usage`
- calls the OpenAI Codex usage endpoint on demand
- shows a dedicated usage summary card in the Pi conversation
- supports `summary`, `raw`, and `json` output modes
- keeps the raw JSON available when you expand the summary message

## Install

From a local checkout:

```bash
pi install /absolute/path/to/pi-openai-codex-usage
```

Or for a one-off run:

```bash
pi -e /absolute/path/to/pi-openai-codex-usage
```

## Usage

```text
/codex-usage
/codex-usage summary
/codex-usage raw
/codex-usage json
```

- `summary` is the default card view
- `raw` renders the full response body as the main message content
- `json` is an alias for `raw`
- expanding the summary message shows request metadata plus the raw JSON payload

## Authentication

Preferred path:

1. run `pi`
2. run `/login`
3. choose **ChatGPT Plus/Pro (Codex)**
4. run `/codex-usage`

The extension resolves the token from Pi's `openai-codex` provider.

## Environment overrides

You can override the defaults with environment variables:

- `OPENAI_CODEX_USAGE_TOKEN` - explicit bearer token to use instead of Pi auth
- `OPENAI_CODEX_USAGE_ACCOUNT_ID` - explicit ChatGPT account id
- `OPENAI_CODEX_USAGE_BASE_URL` - override the base URL

Default base URL:

- `https://chatgpt.com/backend-api`

Endpoint selection mirrors Codex's own backend client logic:

- if the base URL contains `/backend-api`, the extension requests `/wham/usage`
- otherwise it requests `/api/codex/usage`

## Development

```bash
npm test
npm run check
```

Use `/reload` inside Pi to pick up changes without restarting.

## Notes

- This is intended for **ChatGPT Codex subscription usage**, not OpenAI Platform API billing.
- If the token is not a JWT containing `chatgpt_account_id`, set `OPENAI_CODEX_USAGE_ACCOUNT_ID` explicitly.
