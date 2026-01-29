#!/usr/bin/env bash
set -euo pipefail

# Usage: curl -fsSL setup.andreimaxim.com | bash

DOTFILES_REPO="https://github.com/andreimaxim/dotfiles.git"
DOTFILES_PATH="$HOME/.dotfiles"

echo "==> Installing git and ansible..."
sudo rpm-ostree install --apply-live git ansible

if [ ! -d "$DOTFILES_PATH" ]; then
    echo "==> Cloning dotfiles..."
    git clone "$DOTFILES_REPO" "$DOTFILES_PATH"
fi

cd "$DOTFILES_PATH/ansible"

echo "==> Installing packages..."
ansible-playbook -K playbooks/packages.yml

echo ""
echo "==> Done! Reboot, then run:"
echo "    cd ~/.dotfiles/ansible && ansible-playbook -K playbooks/tools.yml"
