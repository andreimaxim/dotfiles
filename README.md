# mise bootstrap

Single-user Ubuntu 26.04 WSL workstation configuration. The checkout itself is
the global mise configuration and is expected at `~/.config/mise`.

## First bootstrap

```sh
sudo apt update && sudo apt install -y git curl ca-certificates
curl --proto '=https' --tlsv1.2 --silent --show-error --fail --location https://mise.run |
  MISE_VERSION=v2026.7.12 sh
export PATH="$HOME/.local/bin:$PATH"
mkdir -p ~/.config
git clone https://github.com/andreimaxim/dotfiles.git ~/.config/mise
cd ~/.config/mise
mise bootstrap --dry-run
```

`--force-dotfiles` does not create backups. Before the first apply, preserve
anything irreplaceable; preferably export the WSL distribution from PowerShell
after running `wsl --shutdown`.

After making that backup, apply the bootstrap:

```sh
mise bootstrap --yes --force-dotfiles
```

The bootstrap installs and enables Docker and Docker Compose. Native `psql` and
`redis-cli` clients are also installed, but projects own their database and
cache containers. Log out and back in after the first bootstrap to use Docker
without `sudo`.

The tracked Git configuration seeds `~/.config/git/config` only when needed.
Bootstrap also converts the symlink created by older versions into a regular
file. Later machine-specific edits remain local and are not overwritten.

WezTerm runs on Windows; its preserved configuration is
`files/windows/wezterm.lua` and is intentionally not deployed.

After verifying the new shell and Docker, uninstall the previous Determinate Nix
installation with `sudo /nix/nix-installer uninstall`. Preserve any uncommitted
work before removing the old `~/.config/home-manager` checkout.

For updates, pull the repository, review `mise bootstrap --dry-run`, then run
`mise bootstrap --yes`. Use `mise install` to resolve and install tool updates.

## Amp

Bootstrap deploys Claudie, the Claude Code handoff plugin, into
`~/.config/amp/plugins/claudie/`. It copies the entrypoint because Amp
does not discover symlinked entrypoints, and links the bundled
`claudie:handing-off-to-claude` skill. The plugin
uses the Claude Agent SDK; Amp's Bun runtime caches the pinned SDK on first use.
It runs the existing `claude` binary with its login and user/project/local settings.
Claude Code 2.1.285 or newer must already be installed and authenticated.

After planning in Amp, say "ask Claude to implement". Claude runs on Opus 5.5
with high effort in the same directory. For independent advice, Claude Code acts
as an external oracle on Fable 5.1/high. "Ask Claude for a review", "ask Claude for
a second opinion", and "consult Claude as an oracle" use this same consultation
flow. The oracle inspects the code and returns findings or recommendations without
implementing them. Consultations use plan permissions, inspection tools, no MCP
tools, and deny requests that need permission approval.

Each handoff covers one bounded task. In both modes, Amp assesses Claude's result
and writes its own response or continues already-authorized work. For implementation,
Amp assesses the changes and verifies as needed before claiming completion. A review
request alone does not authorize implementation. Claude's original reply remains in
the tool result.

If Claude asks a question needed to finish the task, Amp can answer using explicit
decisions already settled with you in the conversation. Missing answers, new choices,
and new permissions come back to you. Continuations use the same session and mode;
Amp forwards your replies unchanged or supplies the relevant settled decision context.
Once Claude completes the task or answers the consultation, ordinary conversation
stays with Amp, including questions about Claude's work. Explicitly ask to continue
with Claude to resume it after completion. Asking Claude to implement an oracle
recommendation starts a new implementation session; asking Amp to implement it stays
with Amp.

Each turn uses one tool call, which stays pending until the stream and process end.
Implementation shows **Opus is implementing** then **Opus has replied**; consultations
show **Consulting Fable** then **Fable has spoken**. There is no separate wait call or
session-ID output. An Opus reply may be a clarification or blocker, not completed work.

Only one Claude turn can run through the plugin at a time. The **claudie: Stop Claude
Code** command, cancelling the Amp turn, or unloading the plugin stops the SDK worker
without undoing edits. Claude persists the conversation; the plugin privately saves
the latest session per checkout, Amp thread, and flow under
`${XDG_STATE_HOME:-~/.local/state}/amp/claudie/`. Tools start a new task by default;
`resume: true` explicitly continues the saved task, including after reload.
This is a machine-local plugin, not a global Amp plugin; do not install it in orbs.

Image attachments are sent as image bytes, not links. The plugin downloads Amp
attachments through authenticated `amp files get` and removes temporary downloads
after encoding, including on failure or cancellation. Local paths also work;
supported formats are PNG, JPEG, GIF, and WebP.

The tracked entrypoint uses the stock Claude Code system prompt with appended
handoff instructions, `acceptEdits` implementation permissions with optional scoped
`allowed_tools`.

The currently installed entrypoint has separate local customizations:

- It reads `~/.claude/SYSTEM.md` on each submission instead of using the stock
  prompt. A missing, unreadable, or empty file fails the handoff.
- Implementation uses `bypassPermissions`; explicit deny rules still apply.

These differences are not part of the tracked bootstrap copy. Preserve them
when updating the installed entrypoint. Both variants use the same bundled skill.

### Verifying Claudie

The unit tests run the relay against a fake Amp host, fake SDK responses, and a
fake attachment downloader. They check argument construction, literal output,
session files, cleanup, and waiting for a Node subprocess. They do not launch
Claude, verify SDK permission enforcement, or render Amp's transcript.

```sh
node --test files/amp/plugins/claudie/*.unit.test.ts

CLAUDE_RELAY_UNDER_TEST="$HOME/.config/amp/plugins/claudie/index.ts" \
  node --test files/amp/plugins/claudie/*.unit.test.ts
```

Live acceptance checks use the installed plugin and real Claude SDK, with user
approval because they consume model usage. Use a disposable fixture and keep the
production prompt, permissions, and relay unchanged:

- Have Opus implement a bounded change. Check the resulting files with assertions
  written independently of its implementation and tests.
- Reload the plugin and continue the session. Verify information from the first
  turn that is neither repeated in the follow-up nor stored in fixture files.
- Have Fable review a known defect. Check the finding against the defect and compare
  fixture files before and after. An unchanged fixture demonstrates that run was
  read-only, not that arbitrary writes are impossible. For image changes, also check
  an attached image whose answer is absent from the text prompt.
- Invoke Stop while a fixture command is running. Observe the real worker and its
  descendant exiting, and verify the cancelled command cannot finish its write.
  An abort flag or manually killing the child is not evidence of SDK cancellation.
- Inspect the rendered pending and completed Amp rows: model-specific labels,
  one call per turn, no session UUID, and the preserved reply panel.

Record observed model IDs from Claude's transcript and report live, unit, and UI
results separately. A failed setup or unavailable browser is an unverified check,
not a pass. Do not replace missing live evidence with a larger unit-test count.

## Claude Code

Bootstrap links the tracked settings, replacement system prompt, Finder, Oracle,
Librarian, and 2 personal skills into `~/.claude/`. It leaves credentials,
sessions, unrelated skills, and other Claude files alone. Back up an existing
`~/.claude/settings.json` before replacing it; the normal dotfile conflict checks
apply. Claude Code itself must already be installed and authenticated.

## Projects

Projects use only `.ruby-version` and `.env`. Native mise activation discovers
`.env` in the current directory and its ancestors, updates the shell on `cd`,
and restores variables when leaving. Its status line shows environment changes
compactly without tool listings or truncation:

```sh
printf '%s\n' 3.4.4 > .ruby-version
```

Unlike direnv, this convention has no per-project approval prompt. Mise parses
`.env` as dotenv data rather than shell code, but an untrusted checkout can
still set security-sensitive variables or select a runtime. Review project
files before entering and do not put secrets in Git.

Deployed dotfiles are literal tracked files under `files/`; rollback is a normal
Git checkout followed by a reviewed bootstrap apply. Git config is the exception:
bootstrap seeds it once so local credentials and machine-specific settings stay
outside the repository.
