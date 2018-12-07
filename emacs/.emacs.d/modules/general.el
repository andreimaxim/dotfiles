(use-package tool-bar
  :ensure nil
  :config
  (tool-bar-mode -1))

(use-package scroll-bar
  :defer t
  :ensure nil
  :config
  (scroll-bar-mode -1))

(use-package menu-bar
  :ensure nil
  :config
  (menu-bar-mode -1)
  :bind
  ([S-f10] . menu-bar-mode))

(use-package tooltip
  :defer t
  :ensure nil
  :custom
  (tooltip-mode -1))

(use-package try
	     :ensure t)

(use-package ace-window)
(use-package aggressive-indent)
(use-package ag)
(use-package better-defaults)
(use-package dired-k)
(use-package ggtags)
(use-package ibuffer-projectile)
(use-package multi-term)
;; (use-package neotree)
(use-package org)
(use-package popwin)
(use-package rainbow-delimiters)
(use-package smartparens
  :init
  (smartparens-global-mode)
  )

;; Code completion
(use-package company)
(use-package company-quickhelp)
(use-package company-statistics)
(use-package flycheck)
(use-package flycheck-pos-tip)
(use-package flyspell-correct-helm)
(use-package helm)
(use-package helm-ag)
(use-package helm-company)
(use-package helm-gtags)
(use-package helm-projectile)

;; Git
(use-package git-link)
(use-package git-timemachine)
(use-package gitconfig-mode)
(use-package gitignore-mode)
(use-package magit)
(use-package orgit)

;; From Spacemacs
(windmove-default-keybindings)

(global-aggressive-indent-mode 1)
(add-to-list 'aggressive-indent-excluded-modes 'html-mode)

;; Magit configuration
(setq-default git-magit-status-fullscreen t)
(setq magit-repository-directories '("~/src/"))

(provide 'general)
