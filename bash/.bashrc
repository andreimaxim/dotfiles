#!/usr/bin/env bash

export PATH="/usr/local/sbin:$PATH"
export EDITOR='vim'
export VISUAL=$EDITOR

export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

. $HOME/.bash/aliases.sh
. $HOME/.bash/colors.sh
. $HOME/.bash/git.sh
. $HOME/.bash/theme.sh
. $HOME/.bash/rbenv.sh
. $HOME/.bash/secrets.sh

export JRUBY_OPTS="--dev"
export JAVA_OPTS="-Djsse.enableSNIExtension=false"
