;;; early-init.el --- Pre-start initialization -*- lexical-binding: t -*-

;;; Commentary:
;;
;; The early-init.el file was introduced in Emacs 27.1 and it is loaded before
;; init.el and before Emacs initializes package.el or the UI. This means that
;; we can introduce some performance tweaks to improve the start-up performance.

;;; Code:

;; Avoid garbage collection during startup.
(setq gc-cons-threshold most-positive-fixnum
      gc-cons-percentage 0.6)

;; Disable default package.el initialization
;;
;; init.el will call 'package-initialize _after_ properly configuring
;; package.el.
(setq package-enable-at-startup nil)

;; Prevent the glimpse of un-styled Emacs by disabling these UI elements early.
(push '(menu-bar-lines . 0) default-frame-alist)
(push '(tool-bar-lines . 0) default-frame-alist)
(push '(vertical-scroll-bars) default-frame-alist)


;; Resizing the Emacs frame can be a terribly expensive part of changing the
;; font. By inhibiting this, we easily halve startup times with fonts that are
;; larger than the system default.
(setq frame-inhibit-implied-resize t)

;; Disable GUI elements
;; NOTE: Avoid calling `menu-bar-mode', `tool-bar-mode', and `scroll-bar-mode'
;; because they trigger frame redraws and cause flicker. Instead, set the
;; variables directly (frame params are already set above).
(setq menu-bar-mode nil
      tool-bar-mode nil
      scroll-bar-mode nil)
(setq inhibit-splash-screen t
      use-file-dialog nil)

;; PERF: Suppress redisplay and messages during startup to prevent flash of
;; unstyled Emacs. This is the key trick from Doom Emacs.
(setq-default inhibit-redisplay t
              inhibit-message t)

;; Performance tweaks from Doom Emacs
;; Disable bidirectional text scanning for a modest performance boost.
(setq-default bidi-display-reordering 'left-to-right
              bidi-paragraph-direction 'left-to-right)
(setq bidi-inhibit-bpa t)

;; Reduce rendering/line scan work by not rendering cursors or regions
;; in non-focused windows.
(setq-default cursor-in-non-selected-windows nil)
(setq highlight-nonselected-windows nil)

;; More performant rapid scrolling over unfontified regions.
(setq fast-but-imprecise-scrolling t)

;; Increase how much is read from processes in a single chunk (default is 4kb).
(setq read-process-output-max (* 64 1024))  ; 64kb

;; Inhibits fontification while receiving input, improving scrolling performance.
(setq redisplay-skip-fontification-on-input t)

;; Reset inhibit-redisplay after startup. We use `after-init-hook' because
;; the theme should be loaded by then.
(add-hook 'after-init-hook
          (lambda ()
            (setq-default inhibit-redisplay nil
                          inhibit-message nil)
            (redisplay)))

;; If an `.el' file is newer than its corresponding `.elc', load the `.el'.
(setq load-prefer-newer t)

;; Native compilation settings
(when (featurep 'native-compile)
  ;; Ignore compiler warnings
  (setq native-comp-async-report-warnings-errors nil)
  ;; Async compilation
  (setq native-comp-deferred-compilation nil))


(provide 'early-init)
;;; early-init.el ends here
