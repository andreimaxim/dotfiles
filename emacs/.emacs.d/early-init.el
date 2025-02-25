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
(menu-bar-mode -1)
(tool-bar-mode -1)
(scroll-bar-mode -1)
(setq inhibit-splash-screen t)
(setq use-file-dialog nil)

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
