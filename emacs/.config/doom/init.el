;;; init.el -*- lexical-binding: t; -*-

(doom!
 :completion
 (vertico +icons)
 (corfu +orderless +icons +dabbrev)

 :ui
 doom
 doom-dashboard
 modeline
 hl-todo
 ophints
 (popup +defaults)
 (vc-gutter +pretty)
 workspaces

 :editor
 (evil +everywhere)
 file-templates
 fold
 (format +onsave)
 snippets
 (whitespace +guess +trim)

 :emacs
 dired
 electric
 tramp
 undo
 vc

 :checkers
 syntax

 :tools
 direnv
 debugger
 (eval +overlay)
 (lookup +docsets)
 (lsp +eglot)
 magit
 tree-sitter

 :lang
 emacs-lisp
 (ruby +rails +lsp +tree-sitter)
 (go +lsp +tree-sitter)
 (javascript +lsp +tree-sitter)
 (rust +lsp +tree-sitter)
 (yaml +lsp +tree-sitter)
 (web +lsp +tree-sitter)
 markdown
 org
 sh

 :config
 (default +bindings +smartparens))
