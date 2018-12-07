(use-package ace-window
  :commands
  (ace-window ace-swap-window ace-delete-window
              ace-select-window ace-delete-other-windows)
  :init
  (define-key global-map [remap other-window] #'ace-window))
