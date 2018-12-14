(use-package bundler)

(use-package enh-ruby-mode
  :mode (("Appraisals\\'" . enh-ruby-mode)
         ("\\(Rake\\|Thor\\|Guard\\|Gem\\|Cap\\|Vagrant\\|Berks\\|Pod\\|Puppet\\)file\\'" . enh-ruby-mode)
         ("\\.\\(rb\\|rabl\\|ru\\|builder\\|rake\\|thor\\|gemspec\\|jbuilder\\)\\'" . enh-ruby-mode))
  :interpreter "ruby"
  :init
  (progn
    (setq enh-ruby-deep-indent-paren nil
          enh-ruby-hanging-paren-deep-indent-level 2)))

(use-package flycheck
  :init
  (add-hook 'prog-mode-hook 'global-flycheck-mode)
  (setq flycheck-ruby-rubocop-executable "/usr/local/bin/rubocop"))

(use-package inf-ruby
  :hook (enh-ruby-mode . inf-ruby-minor)
  :init
  (add-hook 'compilation-filter-hook 'inf-ruby-auto-enter))

(use-package minitest)
(use-package rbenv
  :hook (enh-ruby-mode . rbenv))
(use-package robe
  :init
  (add-hook 'enh-ruby-mode-hook 'robe-mode))

(use-package rspec-mode)
(use-package ruby-test-mode)
(use-package ruby-tools)
(use-package rake)
(use-package yard-mode
  :init
  (add-hook 'enh-ruby-mode-hook 'eldoc-mode)
  (add-hook 'enh-ruby-mode-hook 'yard-mode))

;; (use-package rcodetools
;;   :load-path "modules"
;;   :bind (:map ruby-mode-map
;;               ("C-c C-c" . xmp)))

(provide 'acm/ruby)
;;; ruby.el ends here
