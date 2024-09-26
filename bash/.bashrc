##
# Shell

# History control
shopt -s histappend
HISTCONTROL=ignoreboth
HISTSIZE=32768
HISTFILESIZE="${HISTSIZE}"

# Autocompletion
source /usr/share/bash-completion/bash_completion

# Set complete path
export PATH="./bin:$HOME/.local/bin:$PATH"
set +h

##
# Aliases

# File system
alias ls='eza -lh --group-directories-first --icons'
alias lsa='ls -a'
alias lt='eza --tree --level=2 --long --icons --git'
alias lta='lt -a'
alias ff="fzf --preview 'batcat --style=numbers --color=always {}'"
alias fd="fdfind"

# Directories
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Tools
alias n='nvim'
alias g='git'
alias d='docker'
alias r='rails'
alias lzg='lazygit'
alias lzd='lazydocker'

# Git
alias gs='git status'
alias gcm='git commit -m'
alias gcam='git commit -a -m'
alias gcad='git commit -a --amend'

# Use the Windows version of ssh so it works with 1Password
alias ssh='ssh.exe'
alias ssh-add='ssh-add.exe'
##
#  Tools init

. "$HOME/.cargo/env"

if command -v mise &>/dev/null; then
  eval "$(mise activate bash)"
fi

if command -v zoxide &>/dev/null; then
  eval "$(zoxide init bash)"
fi

if command -v fzf &>/dev/null; then
  eval "$(fzf --bash)"
fi

##
# Prompt
eval "$(starship init bash)"

# Editor used by CLI
export EDITOR="nvim"
export SUDO_EDITOR="nvim"
export MISE_ENV_FILE=.env
