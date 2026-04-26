;;; emacs-server.el --- Start org-node-ui-lite server for E2E tests  -*- lexical-binding: t; -*-
;;
;; Usage: emacs --batch --load e2e/emacs-server.el
;;
;; Sets org-mem-watch-dirs to e2e/fixtures/, enables org-mem-updater-mode and
;; org-node-cache-mode per the documented quickstart, then starts the HTTP
;; server.  A timer-based watchdog restarts httpd within 100 ms of a crash
;; (org-mem async scan callbacks on Emacs 30.x can kill httpd).  The main
;; accept-process-output loop keeps Emacs alive and processes network I/O.

(defconst e2e/test-dir
  (file-name-directory (or load-file-name buffer-file-name))
  "Absolute path to the e2e/ directory.")

(defconst e2e/repo-root
  (expand-file-name ".." e2e/test-dir)
  "Absolute path to the repository root.")

;;; Load paths ----------------------------------------------------------------

(add-to-list 'load-path e2e/repo-root)

(let ((pkgs (expand-file-name
             (format ".eldev/%d.%d/packages"
                     emacs-major-version emacs-minor-version)
             e2e/repo-root)))
  (when (file-directory-p pkgs)
    (dolist (d (directory-files pkgs t "^[^.]"))
      (when (file-directory-p d)
        (add-to-list 'load-path d)))))

;;; Load packages -------------------------------------------------------------

(require 'org-node-ui-lite)

;;; Configure per documentation -----------------------------------------------

;; Point org-mem at the test fixture org files.
(setq org-mem-watch-dirs
      (list (expand-file-name "fixtures" e2e/test-dir)))

;; Do not open a browser tab when starting the server.
(setq org-node-ui-lite-open-on-start nil)

;; Enable the two modes documented in org-mem's Quick Start and org-node.
(org-mem-updater-mode +1)
(org-node-cache-mode +1)

;;; Start HTTP server ---------------------------------------------------------

;; Call the internal start function directly so the E2E server does not depend
;; on a pre-built frontend dist/ directory (Playwright uses Vite dev server).
(setq httpd-port org-node-ui-lite-port
      httpd-root e2e/test-dir)
(httpd-start)

(message "e2e: org-node-ui-lite HTTP server listening on port %d" org-node-ui-lite-port)

;;; Watchdog timer ------------------------------------------------------------

;; A dedicated timer restarts httpd within 100 ms of a crash, independently
;; of how long accept-process-output blocks in the main event loop below.
;; This is faster and more reliable than checking inside the main loop.
(defun e2e/httpd-watchdog ()
  "Restart httpd if it stopped running."
  (unless (httpd-running-p)
    (message "e2e: watchdog: httpd not running, restarting on port %d" httpd-port)
    (condition-case err
        (httpd-start)
      (error (message "e2e: watchdog: failed to restart httpd: %S" err)))))

(run-with-timer 0 0.1 #'e2e/httpd-watchdog)

;;; Event loop ----------------------------------------------------------------

;; Keep Emacs alive so timers fire and network I/O is processed.
;; condition-case prevents async errors from terminating the batch process.
(while t
  (condition-case err
      (accept-process-output nil 1)
    (error (message "e2e: non-fatal error in event loop: %S" err))))
