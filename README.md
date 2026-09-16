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

## Claude Code

Bootstrap links the tracked settings, replacement system prompt, Finder, Oracle,
Librarian, and 6 personal skills into `~/.claude/`. It leaves credentials,
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
