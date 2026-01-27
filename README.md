# Dotfiles

Ansible playbooks to provision a fresh Fedora Kinoite machine.

## Quick Start

On a fresh Fedora Kinoite installation, open a terminal and run:

```bash
sudo rpm-ostree install --apply-live git ansible
```

Then clone the repo:

```bash
git clone https://github.com/andreimaxim/dotfiles.git ~/.dotfiles
cd ~/.dotfiles/ansible
```

There are two main steps:

Installing the initial base backages:

```bash
ansible-playbook -K playbooks/packages.yml
```

A reboot is required.

Then the rest of the local config, apps and packages:

```bash
ansible-playbook -K playbooks/tools.yml
```
