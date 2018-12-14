(use-package auto-package-update
  :ensure t
  :config
  (setq auto-package-update-delete-old-versions t
        auto-package-update-interval 4)
  (auto-package-update-maybe))

(use-package flx)

(use-package ivy
  :demand
  :config
  (setq ivy-use-virtual-buffers t
        ivy-count-format "%d/%d "
        ivy-re-builders-alist '((swiper . ivy--regex-plus)
                                (counsel-ag . ivy--regex-plus)
                                (t . ivy--regex-fuzzy))
        ivy-initial-inputs-alist nil)
  (ivy-mode 1))

(use-package ivy-hydra)

(use-package counsel
  :bind
  (("M-x" . counsel-M-x) 
   ("C-x C-f" . counsel-find-file)
   ("C-c a" . counsel-ag)))

(use-package counsel-gtags
  :bind
  ("M-t" . counsel-gtags-find-definition)
  ("M-r" . counsel-gtags-find-reference)
  ("M-s" . counsel-gtags-find-symbol)
  ("M-," . counsel-gtags-go-backward))

(use-package counsel-projectile)

(use-package swiper
  :bind
  (("C-s" . swiper)))

(use-package company
  :commands (company-mode global-company-mode company-complete
                          company-complete-common company-manual-begin company-grab-line)
  :config
  (setq company-idle-delay nil
        company-tooltip-limit 10
        company-dabbrev-downcase nil
        company-dabbrev-ignore-case nil
        company-dabbrev-code-other-buffers t
        company-tooltip-align-annotations t
        company-require-match 'never
        company-global-modes '(not eshell-mode comint-mode erc-mode message-mode help-mode gud-mode)
        company-frontends '(company-pseudo-tooltip-frontend company-echo-metadata-frontend)
        company-backends '(company-capf company-dabbrev company-ispell)
        company-transformers '(company-sort-by-occurrence))
  (global-company-mode +1))

(use-package flycheck)
(use-package flycheck-pos-tip)
(use-package flyspell-correct-ivy)

(use-package company-dict)

(use-package company-quickhelp
  :after company
  :config
  (setq company-quickhelp-delay nil)
  (company-quickhelp-mode +1))


(use-package dired-k
  :config
  (setq dired-k-style 'git))
(use-package ggtags)
(use-package better-defaults)

(use-package rainbow-delimiters
  :config
  (add-hook 'prog-mode-hook #'rainbow-delimiters-mode))
(use-package smartparens
  :config
  (smartparens-global-mode))

(use-package git-timemachine)
(use-package gitconfig-mode)
(use-package gitignore-mode)
(use-package magit
  :config
  (setq magit-completing-read-function 'ivy-completing-read
        magit-status-fullscreen t
        magit-repository-directories '("~/src/")))

(use-package aggressive-indent
  :config 
  (global-aggressive-indent-mode 1)
  (add-to-list 'aggressive-indent-excluded-modes 'html-mode))

(use-package multi-term
  :commands
  (multi-term multi-term-next multi-term-prev)
  :config
  (setq multi-term-program (getenv "SHELL")
        multi-term-switch-after-close 'PREVIOUS))

(use-package neotree
  :commands (neotree-show
             neotree-hide
             neotree-toggle
             neotree-dir
             neotree-find
             neo-global--with-buffer
             neo-global--window-exists-p)
  :config
  (setq neo-create-file-auto-open nil
        neo-auto-indent-point nil
        neo-autorefresh nil
        neo-mode-line-type 'none
        neo-window-width 70
        neo-show-updir-line nil
        neo-theme 'nerd ; fallback
        neo-banner-message nil
        neo-confirm-create-file #'off-p
        neo-confirm-create-directory #'off-p
        neo-show-hidden-files nil
        neo-keymap-style 'concise
        neo-hidden-regexp-list
        '(;; vcs folders
          "^\\.\\(git\\|hg\\|svn\\)$"
          ;; compiled files
          "\\.\\(pyc\\|o\\|elc\\|lock\\|css.map\\)$"
          ;; generated files, caches or local pkgs
          "^\\(node_modules\\|vendor\\|.\\(project\\|cask\\|yardoc\\|sass-cache\\)\\)$"
          ;; org-mode folders
          "^\\.\\(sync\\|export\\|attach\\)$"
          "~$"
          "^#.*#$"))

  (when (bound-and-true-p winner-mode)
    (push neo-buffer-name winner-boring-buffers)))

(use-package projectile
  :ensure t
  :config
  (setq projectile-completion-system 'ivy
        projectile-project-search-path '("~/src/")
        projectile-git-command "fd . --hidden --no-ignore-vcs --print0 --color never --ignore-file ~/.fdrc"
        projectile-indexing-method 'alien)
  (define-key projectile-mode-map (kbd "C-c p") 'projectile-command-map)
  (projectile-global-mode)
  )

(use-package ibuffer-projectile)

(use-package restclient
  :mode ("\\.http\\'" . restclient-mode))

(provide 'acm/tools)
