(use-package color-theme-sanityinc-tomorrow
  :config
  (color-theme-sanityinc-tomorrow--define-theme night))

(use-package highlight-indentation)
(use-package highlight-numbers)

(use-package fill-column-indicator)
(use-package git-gutter-fringe
  :ensure t
  :config
  (global-git-gutter-mode +1))
