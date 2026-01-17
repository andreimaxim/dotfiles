;;; init.el --- Emacs  -*- lexical-binding: t -*-
;;
;; Author:           Andrei Maxim
;; URL:              https://github.com/andreimaxim/emacs.d
;; Version:          0.9.0
;;
;; This file is not part of GNU Emacs.
;;
;; License: MIT
;;

;;; Commentary:


;;; Code:

;;; Package setup
;;
(require 'package)
(add-to-list 'package-archives
	     '("melpa" . "https://melpa.org/packages/") t)
(package-initialize)

(unless package-archive-contents
  (package-refresh-contents))

(add-to-list 'load-path (expand-file-name "modules" user-emacs-directory))

(require 'andreimaxim-defaults)
(require 'andreimaxim-ux)
(require 'andreimaxim-prog)
(require 'andreimaxim-ruby-align)
(require 'andreimaxim-org)

;; Reset the GC to a normal value after startup
(add-hook 'emacs-startup-hook
	        (lambda ()
	          (setq gc-cons-threshold (* 50 1024 1024)
		              gc-cons-percentage 0.1)))

;;; init.el ends here
