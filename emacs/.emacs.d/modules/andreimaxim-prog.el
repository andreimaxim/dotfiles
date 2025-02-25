;; Load the env variables, especially rbenv settings
(use-package display-line-numbers
  :ensure nil
  :hook (prog-mode . display-line-numbers-mode)
  :config (setq display-line-numbers-width 3))

(use-package flymake
  :ensure nil
  :hook (prog-mode . flymake-mode))

(use-package shell-script-mode
  :ensure nil
  :mode ("\\.env\\'" . shell-script-mode))

(use-package exec-path-from-shell
  :ensure t
  :config
  (exec-path-from-shell-initialize))

(use-package ansi-color
  :ensure nil
  :hook (compilation-filter . ansi-color-compilation-filter))

;; The default electric-indent will indent only on return, which feels a bit
;; too late.
(use-package aggressive-indent
  :ensure t
  :hook (prog-mode . aggressive-indent-mode))

;; Automatically fix whitespaces, but only the ones we've changed.
(use-package ws-butler
  :ensure t
  :hook (prog-mode . ws-butler-mode))

(use-package magit
  :ensure t
  :bind (("C-x g" . magit-status)
         ("C-c g" . magit-dispatch)
         ("C-c f" . magit-file-dispatch))
  :custom (magit-define-global-key-bindings 'recommended))

(use-package tree-sitter
  :ensure t
  :config (use-package tree-sitter-langs
            :ensure t)
  :hook ((css-mode html-mode javascript-mode json-mode ruby-mode typescrypt-mode) . tree-sitter-hl-mode))

(use-package ruby-mode
  :ensure nil
  :mode
  ("\\.jbuilder\\'" . ruby-mode)
  :config (setq ruby-align-to-stmt-keywords t))

(use-package robe
  :ensure t
  :hook (ruby-mode . robe-mode))

(use-package yasnippet
  :ensure t
  :hook  ((prog-mode org-mode) . yas-minor-mode))

(use-package yasnippet-snippets
  :ensure t)

(use-package emmet-mode
  :ensure t)

(use-package devdocs
  :ensure t
  :config
  (global-set-key (kbd "C-h D") 'devdocs-lookup))

(use-package yard-mode
  :ensure t
  :hook (ruby-mode . yard-mode))

(use-package web-mode
  :ensure t
  :mode
  (".html.erb" ".liquid")
  :custom
  (web-mode-enable-front-matter-block t))

;; Connect an Emacs REPL buffer to a Ruby subprocess.
(use-package inf-ruby
  :ensure t
  :hook (ruby-mode . inf-ruby-minor-mode)
  :custom (inf-ruby-console-environment "development")
  :bind (:map inf-ruby-minor-mode-map
              ("C-c C-s" . inf-ruby-console-auto)))

(use-package seeing-is-believing
  :ensure t
  :hook (ruby-mode . seeing-is-believing))

(use-package yaml-mode
  :ensure t)

(use-package json-mode
  :ensure t
  :config
  (setq js-indent-level 2))

(use-package markdown-mode
  :ensure t)

(use-package dockerfile-mode
  :ensure t)

(use-package typescript-mode
  :ensure t)

(use-package dape
  :ensure t)

(provide 'andreimaxim-prog)
;;; andreimaxim-prog.el ends here
