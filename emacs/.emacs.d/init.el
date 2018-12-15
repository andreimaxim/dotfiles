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
(package-initialize)

;; Load Org mode and then parse the README.org file code blocks.
(require 'org)
(org-babel-load-file (expand-file-name "README.org" user-emacs-directory))
