# Fedora Kinoite Bootstrap

Ansible playbooks to provision a fresh Fedora Kinoite machine.

## Quick Start

On a fresh Fedora Kinoite installation, open a terminal and run:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/andreimaxim/dotfiles/main/ansible/install)
```

This will:
1. Install git and ansible via rpm-ostree (using `--apply-live`)
2. Clone the dotfiles repository to `~/.dotfiles`
3. Run the Ansible playbook

After completion, reboot to finalize rpm-ostree changes:
```bash
systemctl reboot
```

## What Gets Installed

### Base Packages (rpm-ostree)
git, git-lfs, vim-enhanced, stow, fzf, bash-completion, tig, 1password, 1password-cli, gcc, openssl-devel, podman-docker

### Rust + Cargo Tools
eza, bat, fd-find, starship, zoxide, git-delta

### Language Runtimes (via mise)
Ruby, Node.js (LTS), Go, Java (LTS)

### CLI Tools
lazygit, lazydocker, bun

### AI Coding Assistants
Claude Code, OpenCode, Amp

### Dotfiles (via stow)
bash, git, vim, delta, eza, lazygit, bat, tig, claude, opencode, emacs

## Manual Usage

If you've already cloned the repo:

```bash
cd ~/.dotfiles/ansible
ansible-playbook local.yml
```

Run specific task files:
```bash
ansible-playbook local.yml --start-at-task="Install cargo packages"
```

Dry run:
```bash
ansible-playbook local.yml --check
```

## Directory Structure

```
ansible/
├── ansible.cfg         # Config (sets inventory)
├── inventory           # Localhost definition
├── install             # Bootstrap script
├── local.yml           # Main playbook
└── tasks/
    ├── base-packages.yml
    ├── rust-setup.yml
    ├── runtimes.yml
    ├── cli-tools.yml
    ├── ai-tools.yml
    ├── dotfiles.yml
    └── flatpak.yml
```
