(use-package helm
  :config
  (setq helm-split-window-in-side-p           t ; open helm buffer inside current window
        helm-move-to-line-cycle-in-source     t ; move to end or beginning of source
        helm-ff-search-library-in-sexp        t ; search for library in `require' and `declare-function' sexp.
        helm-scroll-amount                    10 ; scroll 8 lines other window using M-<next>/M-<prior>
        helm-ff-file-name-history-use-recentf t
        helm-echo-input-in-header-line t
        helm-M-x-fuzzy-match t
        helm-semantic-fuzzy-match t
        helm-imenu-fuzzy-match t
        helm-autoresize-max-height 0
        helm-autoresize-min-height 20
        helm-grep-default-command "ack-grep -Hn --no-group --no-color %e %p %f"
        helm-grep-default-recurse-command "ack-grep -H --no-group --no-color %e %p %f")
  (define-key helm-map (kbd "<tab>") 'helm-execute-persistent-action)
  (define-key helm-map (kbd "C-i") 'helm-execute-persistent-action) ; make Tab work in terminal
  (define-key helm-map (kbd "C-z") 'helm-select-action) ; list actions using C-z
  :bind (("C-c h" . helm-command-prefix)
         ("M-x" . helm-M-x)
         ("C-x r b" . helm-filtered-bookmarks)
         ("C-x C-f" . helm-find-files))
  :init
  (helm-mode 1))

(use-package helm-ag)
(use-package helm-company)
(use-package helm-projectile
  :init
  (helm-projectile-on))
