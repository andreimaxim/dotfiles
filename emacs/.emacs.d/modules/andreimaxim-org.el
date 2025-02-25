;; Recommended settings from org-modern-mode
(use-package org
  :ensure t
  :config
  (setq
   ;; Edit settings
   org-auto-align-tags nil
   org-tags-column 0
   org-catch-invisible-edits 'show-and-error
   org-special-ctrl-a/e t
   org-insert-heading-respect-content t

   ;; Org styling, hide markup etc.
   org-hide-emphasis-markers t
   org-pretty-entities t
   org-ellipsis "…"))

;; Better UI for Org
(use-package org-modern
  :ensure t
  :hook (org-mode . org-modern-mode))

(provide 'andreimaxim-org)
