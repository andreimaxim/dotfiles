#!/usr/bin/env bash

# OS X: Open new tabs in same directory
if [ $(uname) = "Darwin" ]; then
  if type update_terminal_cwd > /dev/null 2>&1 ; then
    if ! [[ $PROMPT_COMMAND =~ (^|;)update_terminal_cwd($|;) ]] ; then
      export PROMPT_COMMAND="update_terminal_cwd;$PROMPT_COMMAND"
    fi
  fi
fi
