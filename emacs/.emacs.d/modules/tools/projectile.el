(use-package projectile
  :ensure t
  :config
  (setq projectile-completion-system 'helm
        projectile-project-search-path '("~/src/")
        projectile-git-command "fd . --hidden --no-ignore-vcs --print0 --color never --ignore-file ~/.fdrc"
        projectile-indexing-method 'alien)
  (define-key projectile-mode-map (kbd "C-c p") 'projectile-command-map)
  (projectile-global-mode)
  )

(use-package ibuffer-projectile)
