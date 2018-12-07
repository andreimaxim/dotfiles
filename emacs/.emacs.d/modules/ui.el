(use-package paren
  :ensure nil
  :config
  (show-paren-mode t))

(use-package hl-line
  :ensure nil
  :hook
  (prog-mode . hl-line-mode))

(use-package highlight-numbers
  :ensure t
  :hook
  (prog-mode . highlight-numbers-mode))

;; Always show the column number
(setq column-number-mode t)



(setq linum-format " %d")
(global-linum-mode 1)

(electric-indent-mode +1)

(provide 'ui)
