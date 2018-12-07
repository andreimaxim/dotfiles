eval "`dircolors -b`"
alias ls='ls --color=auto'

# colored grep
alias grep='grep --color=auto'

# Git
alias gs='git status'


# FD with global config file
alias fd='fd --no-ignore-vcs --ignore-file ~/.fdrc'


# AceStream
function soccer-stream()
{
	local stream_id=$1

	acestream-launcher acestream://${stream_id} --player vlc --engine acestreamplayer.engine
}
