;; Ruby
(use-package bundler)
(use-package company-inf-ruby)
(use-package enh-ruby-mode
  :mode (("Appraisals\\'" . enh-ruby-mode)
         ("\\(Rake\\|Thor\\|Guard\\|Gem\\|Cap\\|Vagrant\\|Berks\\|Pod\\|Puppet\\)file\\'" . enh-ruby-mode)
         ("\\.\\(rb\\|rabl\\|ru\\|builder\\|rake\\|thor\\|gemspec\\|jbuilder\\)\\'" . enh-ruby-mode))
  :interpreter "ruby"
  :init
  (progn
    (setq enh-ruby-deep-indent-paren nil
          enh-ruby-hanging-paren-deep-indent-level 2)))

;; (use-package enh-ruby-mode)
(use-package flymake-ruby)
(use-package inf-ruby)
(use-package rake)
(use-package rbenv)
(use-package robe)
(use-package rubocop)
(use-package rspec-mode)
(use-package yard-mode)

;;; Ruby
(add-hook 'enh-ruby-mode-hook 'robe-mode)
(add-hook 'enh-ruby-mode-hook 'yard-mode)

(eval-after-load 'company
  '(push 'company-robe company-backends))
;; Autocomplete
(add-hook 'robe-mode-hook 'ac-robe-setup)

(defadvice inf-ruby-console-auto (before activate-rbenv-for-robe activate)
  (rbenv-use-corresponding))

(provide 'ruby)
