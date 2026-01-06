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

# Editor used by CLI
export EDITOR="nvim"
export SUDO_EDITOR="nvim"
export MISE_ENV_FILE=.env

##
# Aliases

# File system
alias ls='eza -lh --group-directories-first'
alias lsa='ls -a'
alias lt='eza --tree --level=2 --long --icons --git'
alias lta='lt -a'
alias ff="fzf --preview 'batcat --style=numbers --color=always {}'"
alias fd="fdfind"
alias cd="z"

# Directories
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Tools
alias n='nvim'
alias g='git'
alias d='docker'
alias lzg='lazygit'
alias lzd='lazydocker'
alias opencode="$HOME/.opencode/bin/opencode"

# Rails
alias r='bin/rails'
alias rs="bin/rails server"
alias rc="bin/rails console"
alias rt="bin/rails test"
alias rdb="bin/rails dbconsole"
alias rdm="bin/rails db:migrate"
alias rdr="bin/rails db:rollback"
alias rgc="bin/rails g controller"
alias rgj="bin/rails g job"
alias rgm="bin/rails g model"
alias rgs="bin/rails g script"
alias drs="bundle exec rdbg -n --open=vscode -c -- bin/rails s"
alias drc="bundle exec rdbg -n --open=vscode -c -- bin/rails c"

# Git
alias gs='git status'

# Use the Windows version of ssh so it works with 1Password
alias ssh='ssh.exe'
alias ssh-add='ssh-add.exe'

##
#  Tools init
. "$HOME/.cargo/env"

if command -v fzf &>/dev/null; then
  source /usr/share/bash-completion/completions/fzf
  source /usr/share/doc/fzf/examples/key-bindings.bash
fi

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# opencode
export PATH=/home/andrei/.opencode/bin:$PATH

# Amp CLI
export PATH="/home/andrei/.amp/bin:$PATH"

##
# Prompt
eval "$(starship init bash)"

if command -v mise &>/dev/null; then
  eval "$(mise activate bash)"
fi

if command -v zoxide &>/dev/null; then
  eval "$(zoxide init bash)"
fi
