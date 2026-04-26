;;; emacs-server.el --- Start org-node-ui-lite server for E2E tests  -*- lexical-binding: t; -*-
;;
;; Usage: emacs --batch --load e2e/emacs-server.el
;;
;; Sets org-mem-watch-dirs to e2e/fixtures/, enables org-mem-updater-mode and
;; org-node-cache-mode per the documented setup, then starts the HTTP server.
;; Runs an accept-process-output loop so the server stays alive.

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

;;; Event loop ----------------------------------------------------------------

;; Keep Emacs alive so the HTTP server continues to handle requests.
;; accept-process-output processes network I/O and async scan callbacks.
;; condition-case prevents async errors (e.g. from org-mem scan callbacks)
;; from terminating the batch process before Playwright teardown sends SIGTERM.
(while t
  (condition-case err
      (accept-process-output nil 1)
    (error (message "e2e: non-fatal error in event loop: %S" err))))
