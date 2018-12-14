;; Actual UI and various UX improvements.
(set-default-font "Pragmata Pro-13")
(setq-default line-spacing 2)

(use-package highlight-indentation)
(use-package highlight-numbers)

;; Funky modeline, from the Doom project
(use-package dash)
(use-package all-the-icons)
(use-package eldoc-eval
  :config
  (eldoc-in-minibuffer-mode 1))

(use-package doom-modeline
  :config
  (setq doom-modeline-height 27
        doom-modeline-bar-width 1
        doom-modeline-buffer-file-name-style 'truncate-except-project)
  (doom-modeline-init))

(use-package doom-themes
  :config
  (load-theme 'doom-one t)
  (doom-themes-org-config)
  (doom-themes-neotree-config))

(use-package fill-column-indicator)
(use-package git-gutter-fringe
  :ensure t
  :config
  (global-git-gutter-mode +1))

(use-package ace-window
  :commands
  (ace-window ace-swap-window ace-delete-window
              ace-select-window ace-delete-other-windows)
  :init
  (define-key global-map [remap other-window] #'ace-window))

(use-package paren
  :ensure nil
  :config
  (show-paren-mode t))

(use-package hl-line
  :ensure nil
  :config
  (global-hl-line-mode))

;; (use-package highlight-numbers
;;   :ensure t
;;   :hook
;;   (prog-mode . highlight-numbers-mode))

(use-package which-key
  :config
  (which-key-mode))

;; Always show the column number
(setq column-number-mode t)
;; Use the 26+ mode to display line numbers
(global-display-line-numbers-mode)

(provide 'acm/ux)
