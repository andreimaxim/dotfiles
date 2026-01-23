# dotfiles

Collection of dotfiles used in various programs. Initially started from
[Omakub](https://github.com/basecamp/omakub/), but adding a lot of personal
touches.

## Ansible setup

This repo includes Ansible playbooks to bootstrap a Fedora 43 development
laptop.

### Playbooks

- `ansible/terminal-apps.yml`: CLI packages, Cargo tools, PGDG client, mise runtimes
- `ansible/terminal-config.yml`: dotfiles + stow
- `ansible/desktop-apps.yml`: GUI packages + Flatpaks
- `ansible/desktop-config.yml`: desktop settings (currently empty)
- `ansible/dev-laptop.yml`: runs all of the above
- `ansible/base-cli.yml`: terminal apps + config only

### Prerequisites

- Fedora 43 (KDE spin)
- Network access

### Usage

1. Install Ansible and the required collection:
   - `sudo dnf install ansible`
   - `ansible-galaxy collection install community.general`
2. Run the full setup:
   - `ansible-playbook -i localhost, -c local ansible/dev-laptop.yml`

### Customization

- Edit `ansible/terminal-apps.yml` for CLI packages, Cargo tools, PGDG, `mise`.
- Edit `ansible/terminal-config.yml` for `stow` packages.
- Edit `ansible/desktop-apps.yml` for GUI apps and Flatpaks.
- Edit `ansible/desktop-config.yml` for desktop settings.
