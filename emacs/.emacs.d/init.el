;;; init.el -*- lexical-binding: t -*-
;;
;; Author: Andrei Maxim
;; URL:    https://github.com/andreimaxim/dotfiles/emacs
;;
;; This file is not part of GNU Emacs.
;;
;; License: GPLv2

;; Added by Package.el.  This must come before configurations of
;; installed packages.  Don't delete this line.  If you don't want it,
;; just comment it out by adding a semicolon to the start of the line.
;; You may delete these explanatory comments.
;; (package-initialize)

;; Bootstrap the configuration
(require 'core-init (concat user-emacs-directory "core/init"))

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
(load "completion/company")
(load "completion/helm")

(load "tools/dired")
(load "tools/indent")
(load "tools/multi-term")
(load "tools/neotree")
(load "tools/projectile")

(load "ui/ace-window")
(load "ui/fonts")
(load "ui/theme")
(load "ui/which-key")
