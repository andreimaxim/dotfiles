;;; core.el --- the heart of the beast -*- lexical-binding: t; -*-
;;
;; Inspired by the doom-emacs core file.

(defvar acm-debug-mode (or (getenv "DEBUG") init-file-debug)
  "If non-nil, debug is enabled")

(defvar acm-emacs-dir (file-truename user-emacs-directory)
  "The path to the emacs.d directory.")

(defvar acm-core-dir (concat acm-emacs-dir "core/")
  "Where the core files are stored.")

(defvar acm-modules-dir (concat acm-emacs-dir "modules/")
  "Where the configuration modules are stored.")

(defvar acm-local-dir (concat acm-emacs-dir "local/")
  "Root directory for local Emacs files.")

(defvar acm-etc-dir (concat acm-emacs-dir "etc/")
  "Directory for non-volatile storage, like binaries and external dependencies.")

(defvar acm-cache-dir (concat acm-emacs-dir "cache/")
  "Directory for volatile storage, like cache files.")

(defvar acm-packages-dir (concat acm-emacs-dir "packages/")
  "Where packages.el, various plugins and their caches are stored.")

;; Setup the load path
(add-to-list 'load-path acm-core-dir)
(add-to-list 'load-path acm-modules-dir)
(add-to-list 'load-path acm-local-dir)

;; Try to use UTF-8 as the default encoding everywhere
(when (fboundp 'set-charset-priority)
  (set-charset-priority 'unicode))     ; pretty
(prefer-coding-system        'utf-8)   ; pretty
(set-terminal-coding-system  'utf-8)   ; pretty
(set-keyboard-coding-system  'utf-8)   ; pretty
(set-selection-coding-system 'utf-8)   ; perdy
(setq locale-coding-system   'utf-8)   ; please
(setq-default buffer-file-coding-system 'utf-8) ; with sugar on top

;; Some default configs taken verbatim from emacs-doom
(setq-default
 ad-redefinition-action 'accept   ; silence advised function warnings 
 apropos-do-all t                 ; make `apropos' more useful
 compilation-always-kill t        ; kill compilation process before starting another
 compilation-ask-about-save nil   ; save all buffers on `compile'
 compilation-scroll-output t
 confirm-nonexistent-file-or-buffer t
 enable-recursive-minibuffers nil
 idle-update-delay 2              ; update ui less often
 ;; keep the point out of the minibuffer
 minibuffer-prompt-properties '(read-only t point-entered minibuffer-avoid-prompt face minibuffer-prompt)
 ;; History & backup settings (save nothing, that's what git is for)
 auto-save-default nil
 create-lockfiles nil
 history-length 500
 make-backup-files nil
 ;; files
 abbrev-file-name             (concat acm-local-dir "abbrev.el") 
 auto-save-list-file-name     (concat acm-cache-dir "autosave")
 backup-directory-alist       (list (cons "." (concat acm-cache-dir "backup/"))))

;; move custom defs out of init.el
(setq custom-file (concat acm-etc-dir "custom.el"))
(load custom-file t t)

;; be quiet at startup; don't load or display anything unnecessary
(unless noninteractive
  (advice-add #'display-startup-echo-area-message :override #'ignore)
  (setq inhibit-startup-message t
        inhibit-startup-echo-area-message user-login-name
        inhibit-default-init t
        initial-major-mode 'fundamental-mode
        initial-scratch-message nil
        mode-line-format nil))

(eval-and-compile
  (defvar acm--file-name-handler-alist file-name-handler-alist)

  (unless (or after-init-time noninteractive)
    ;; One of the contributors to long startup times is the garbage collector,
    ;; so we up its memory threshold, temporarily. It is reset later in
    ;; `maxim-finalize'.
    (setq gc-cons-threshold 402653184
          gc-cons-percentage 0.6
          file-name-handler-alist nil))

  (require 'cl-lib)

  (require 'melpa)
  (require 'base)
  
  (defun acm-finalize ()
    ;; If you forget to reset this, you'll get stuttering and random freezes!
    (setq gc-cons-threshold 16777216
          gc-cons-percentage 0.1
          file-name-handler-alist acm--file-name-handler-alist))

  (add-hook 'emacs-startup-hook 'acm-finalize))

(provide 'core-init)
