;;; andreimaxim-ruby-align.el --- Alignment rules for Ruby -*- lexical-binding: t -*-

;;; Commentary:

;; Align assignments, hash literals, etc for Ruby
;;
;; Turns something like this:
;;
;;    argument :author, String, required: true
;;    argument :description, ID, required: false
;;
;; into this:
;;
;;    argument :author,      String, required:  true
;;    argument :description, ID,     required: false

;; Taken from Jim Weirich's Emacs configuration:
;; https://github.com/jimweirich/emacs-setup-esk/blob/master/ruby-align.el

;;; Code:
(require 'align)

(add-to-list 'align-rules-list
             '(ruby-comma-delimiter
               (regexp . ",\\(\\s-*\\)[^# \t\n]")
               (repeat . t)
               (modes  . '(ruby-mode))))

(add-to-list 'align-rules-list
             '(ruby-hash-literal
               (regexp . "\\(\\s-*\\)=>\\s-*[^# \t\n]")
               (group 2 3)
               (repeat . t)
               (modes  . '(ruby-mode))))

(add-to-list 'align-rules-list
             '(ruby-hash-literal2
               (regexp . "[a-z0-9]:\\(\\s-*\\)[^# \t\n]")
               (repeat . t)
               (modes  . '(ruby-mode))))

(add-to-list 'align-rules-list
             '(ruby-assignment-literal
               (regexp . "\\(\\s-*\\)=\\s-*[^# \t\n]")
               (repeat . t)
               (modes  . '(ruby-mode))))

(add-to-list 'align-rules-list
             '(ruby-xmpfilter-mark
               (regexp . "\\(\\s-*\\)# => [^#\t\n]")
               (repeat . nil)
               (modes  . '(ruby-mode))))


(provide 'andreimaxim-ruby-align)
;;; andreimaxim-ruby-align.el ends here
