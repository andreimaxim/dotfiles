unlet! skip_defaults_vim
source $VIMRUNTIME/defaults.vim

" Popular modern additions
set number            " Absolute line numbers
set hidden            " Allow switching buffers without saving

set expandtab         " Insert spaces when pressing Tab
set shiftwidth=2      " Indentation level is 2 spaces
set softtabstop=2     " Tab inserts/deletes 2 spaces
" tabstop remains 8 (default) so any hard tabs stand out visually

" Catppuccin theme
set termguicolors
colorscheme catppuccin_mocha
