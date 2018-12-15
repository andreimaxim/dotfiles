;;; init.el --- Personal Emacs configuration -*- lexical-binding: t -*-
;;
;; Author:           Andrei Maxim
;; URL:              https://github.com/andreimaxim/dotfiles/emacs
;; Version:          0.0.1
;; Package-Requires: ((emacs "26.1"))
;;
;; This file is not part of GNU Emacs.
;;
;; License: GPLv2
;;

;;; Commentary:
;;
;; Inspired by the configuration files of several people like:
;;
;; * Bozhidar Batsov (https://github.com/bbatsov/prelude)
;; * Henrik Lissner (https://github.com/hlissner/doom-emacs)
;; * Steve Purcell (https://github.com/purcell/emacs.d)
;;
;; ... and probably others I've seen on https://github.com/caisah/emacs.dz.

;;; Code:
;;
;; Added by Package.el.  This must come before configurations of
;; installed packages.  Don't delete this line.  If you don't want it,
;; just comment it out by adding a semicolon to the start of the line.
;; You may delete these explanatory comments.
;; (package-initialize)

;; Don't attempt to find/apply special file handlers to files loaded during startup.
;; (let ((file-name-handler-alist nil))
;;   ;; If config is pre-compiled, then load that
;;   (if (file-exists-p (expand-file-name "README.elc" user-emacs-directory))
;;       (load-file (expand-file-name "README.elc" user-emacs-directory))
;;     ;; Otherwise use org-babel to tangle and load the configuration
;;     (require 'org)
;;     (org-babel-load-file (expand-file-name "README.org" user-emacs-directory))))

;; Don't attempt to find/apply special file handlers to files loaded during startup.
;; (let ((file-name-handler-alist nil))
;;   ;; If config is pre-compiled, then load that
;;   (if (file-exists-p (expand-file-name "README.el" user-emacs-directory))
;;       (load-file (expand-file-name "README.el" user-emacs-directory))
;;     ;; Otherwise use org-babel to tangle and load the configuration
;;     (require 'org)
;;     (org-babel-load-file (expand-file-name "README.org" user-emacs-directory))))

(require 'org)
(org-babel-load-file (expand-file-name "README.org" user-emacs-directory))

;; ;; Bootstrap the configuration
;; (require 'acm/init (concat user-emacs-directory "core/init"))

;; ;; I honestly have no idea what I'm doing here.

;; ;; Interface, including:
;; ;; * startup screen
;; ;; * typography
;; ;; * theme
;; ;; * general user experience
;; (require 'acm/ux (concat acm-modules-dir "ux"))

;; ;; General tools, like:
;; ;; * completion
;; ;; * navigating files
;; ;; * moving through windows
;; ;; * working with git
;; (require 'acm/tools (concat acm-modules-dir "tools"))

;; ;; Context-specific settings
;; (require 'acm/ruby    (concat acm-modules-dir "ruby"))
;; (require 'acm/clojure (concat acm-modules-dir "clojure"))
;; ;; (require 'acm/elisp)
;; ;; (require 'acm/data)     ; JSON and friends
;; ;; (require 'acm/blogging) ; Jekyll or something like it 
