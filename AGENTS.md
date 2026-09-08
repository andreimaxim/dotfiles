# Repository guidance

This is a single-user, x86_64 Ubuntu 26.04 WSL workstation managed by mise
bootstrap and apt.

- `config.toml` is the global mise config for a checkout at `~/.config/mise`.
- Literal deployable dotfiles live under `files/`; keep `[dotfiles]` sources
  explicit. `files/git/config` is a one-time seed rather than a deployed
  symlink. Windows-only configuration belongs under `files/windows/` and must
  not be deployed into WSL.
- Projects use only `.ruby-version` and `.env`.
- Docker and native database clients are installed globally; projects own their
  PostgreSQL, Redis, and other service containers.
- Keep changes focused and do not introduce alternative machine managers.

Parse TOML/JSON with Python stdlib and validate with mise v2026.7.12. Prefer
`mise config ls`, `mise ls`, status checks, and `mise bootstrap --dry-run` with
an isolated HOME/XDG environment. **Never run a real `mise bootstrap` unless
the user explicitly requests activation.** Do not install packages or start
services during repository validation.
