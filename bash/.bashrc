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
alias d='docker'
alias lzg='lazygit'
alias lzd='lazydocker'
alias opencode="$HOME/.opencode/bin/opencode"
alias opencode="$HOME/.amp/bin/amp"

# Emacs
alias em="emacsclient -c -n"
alias et="emacsclient -t"
alias emacs="emacsclient -c -n -a ''"

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

##
#  Tools init
. "$HOME/.cargo/env"

if command -v fzf &>/dev/null; then
  source /etc/bash_completion.d/fzf
  source /usr/share/fzf/shell/key-bindings.bash
fi

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

##
# Prompt
eval "$(starship init bash)"

if command -v mise &>/dev/null; then
  eval "$(mise activate bash)"
fi

if command -v zoxide &>/dev/null; then
  eval "$(zoxide init bash)"
fi
