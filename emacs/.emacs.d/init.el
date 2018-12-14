;;; init.el -*- lexical-binding: t -*-
;;
;; Author: Andrei Maxim
;; URL:    https://github.com/andreimaxim/dotfiles/emacs
;;
;; This file is not part of GNU Emacs.
;;
;; License: GPLv2
;;
;; Inspired by the configuration files of several people like:
;;
;; * Bozhidar Batsov (https://github.com/bbatsov/prelude)
;; * Henrik Lissner (https://github.com/hlissner/doom-emacs)
;; * Steve Purcell (https://github.com/purcell/emacs.d)
;;
;; ... and probably others I've seen on https://github.com/caisah/emacs.dz.

;; Added by Package.el.  This must come before configurations of
;; installed packages.  Don't delete this line.  If you don't want it,
;; just comment it out by adding a semicolon to the start of the line.
;; You may delete these explanatory comments.
;; (package-initialize)

;; Bootstrap the configuration
(require 'acm/init (concat user-emacs-directory "core/init"))

;; I honestly have no idea what I'm doing here.
;;
;; Most likely the whole `load' will crash fantastically and I will not have any
;; idea why or how to fix it, but it works now so... I guess it's fine?
;;
;; PS: It's obviously not fine.
;;
;; TODO:
;;
;; 1. Move away from a per-package config file (see `which-key') and have more
;;    logical blocks, like `completion'. I guess it should be fine to have
;;    several files for ruby, clojure, etc.
;;
;; 2. Use `require' instead of `load' as it is highly recommended. Probably
;;    having a prefix will avoid potential collisions.
;;
;; 3. Switch from Helm to Ivy + Swiper + Counsel.

;; Interface, including:
;; * startup screen
;; * typography
;; * theme
;; * general user experience
(require 'acm/ux (concat acm-modules-dir "ux"))

;; General tools, like:
;; * completion
;; * navigating files
;; * moving through windows
;; * working with git
(require 'acm/tools (concat acm-modules-dir "tools"))

;; Context-specific settings
;; (require 'acm/org     (concat acm-modules-dir "org"))
(require 'acm/ruby    (concat acm-modules-dir "ruby"))
(require 'acm/clojure (concat acm-modules-dir "clojure"))
;; (require 'acm/elisp)
;; (require 'acm/data)     ; JSON and friends
;; (require 'acm/blogging) ; Jekyll or something like it 
