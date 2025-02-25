;;; andreimaxim-defaults.el --- Provide better defaults -*- lexical-binding: t; -*-

;;; Commentary:

;; Better Emacs defaults

;;; Code:

;; Keep customizations in a separate file that can be easily gitignored.
(setq custom-file (locate-user-emacs-file "custom.el"))

;; No tabs
(setq-default indent-tabs-mode nil)

;; Tab space equivalence
(setq-default tab-width 2)

;; Buffer encoding
(prefer-coding-system       'utf-8)
(set-default-coding-systems 'utf-8)
(set-terminal-coding-system 'utf-8)
(set-keyboard-coding-system 'utf-8)
(set-language-environment   'utf-8)

;; By default, Emacs centers the point vertically whenever the point goes
;; off the screen, which is different to what everything else does (see
;; `Automatic Scrolling' in the manual).
;;
;; Setting `scroll-conservatively' to a value over 100, automatic scrolling
;; does not center the point.
(setq scroll-conservatively 101)

;; Use the visual bell instead of a sound
(setq-default visible-bell t)

;; Emacs generates a lot of beeps.
;;
;; The alternative on macOS is a big yellow warning sign in the middle
;; of the screen, which is even more annoying.
(defun my-terminal-visible-bell ()
  "A friendlier visual bell effect."
  (invert-face 'mode-line)
  (run-with-timer 0.1 nil 'invert-face 'mode-line))

(setq visible-bell nil
      ring-bell-function 'my-terminal-visible-bell)

;; No file dialog
(setq use-file-dialog nil)

;; No dialog box
(setq use-dialog-box nil)

;; No popup windows
(setq pop-up-windows nil)

;; Always show information regarding the current column
(setq column-number-mode t)

;; No empty line indicators
(setq indicate-empty-lines nil)

;; No cursor in inactive windows
(setq cursor-in-non-selected-windows nil)

;; No confirmation for visiting non-existent files
(setq confirm-nonexistent-file-or-buffer nil)

;; Navigate windows using shift+direction
(windmove-default-keybindings)

(fset 'yes-or-no-p 'y-or-n-p)

;; Use the new scroll mode which should be smoother on Emacs 29+
(when (>= emacs-major-version 29)
  (pixel-scroll-precision-mode t))

;; Do not create any backups as any text that's worth a backup will be stored
;; in git or something similar.
(setq make-backup-files nil)

;; Stop making #filename# autosave files and write directly to the original file
(auto-save-visited-mode)

;; Stop making .#filename lock files
(setq create-lockfiles nil)

;; But save every 1s because SSDs are the norm
(setq auto-save-timeout 1)
(setq auto-save-default t)

;; Autorefresh buffers
(global-auto-revert-mode 1)

;; Remember recently edited files
(recentf-mode 1)

;; Save what you enter into minibuffer prompts
(setq history-length 25)
(savehist-mode 1)

;; Remember and restore the last cursor location of opened files
(save-place-mode 1)

;; No startup  screen
(setq inhibit-startup-screen t)

;; No startup message
(setq inhibit-startup-message t)
(setq inhibit-startup-echo-area-message t)

;; No message in scratch buffer
(setq initial-scratch-message nil)

;; Initial buffer
(setq initial-buffer-choice nil)

;; No frame title
(setq frame-title-format nil)

;; WSL clipboard fix
(when (and (getenv "WAYLAND_DISPLAY") (not (equal (getenv "GDK_BACKEND") "x11")))
  (setq interprogram-cut-function
        (lambda (text)
          (with-temp-buffer
            (insert text)
            (call-process-region (point-min) (point-max) "win32yank.exe" nil 0 nil "-i")))))

(provide 'andreimaxim-defaults)
;;; andreimaxim-defaults.el ends here
