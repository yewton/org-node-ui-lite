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
(require 'org-mem)
(require 'org-id)

;;; Configure per documentation -----------------------------------------------

;; Point org-mem at the test fixture org files.
(setq org-mem-watch-dirs
      (list (expand-file-name "fixtures" e2e/test-dir)))

;; Do not open a browser tab when starting the server.
(setq org-node-ui-lite-open-on-start nil)

;; Force synchronous population of cache to avoid flaky E2E tests
(setq org-id-track-globally t)
(setq org-id-locations-file (expand-file-name ".org-id-locations" e2e/test-dir))
(org-id-update-id-locations (directory-files-recursively (expand-file-name "fixtures" e2e/test-dir) "\\.org$"))
(setq org-mem-do-sync-with-org-id t)

;; Use org-mem-initial-scan-hook to know exactly when the scan is complete
(defvar e2e-scan-done nil)
(add-hook 'org-mem-initial-scan-hook (lambda () (setq e2e-scan-done t)))

;; 1. Trigger background initial scan via updater mode
(org-mem-updater-mode +1)

(message "e2e: Waiting for org-mem async scan to complete...")
(let ((max-wait 20)
      (waited 0))
  (while (and (not e2e-scan-done) (< waited max-wait))
    (accept-process-output nil 0.5)
    (setq waited (+ waited 0.5))))

;; 2. Enable org-node cache mode. Since it resets cache, it will trigger
;; another background scan. We hook into it to know when it finishes.
(setq e2e-scan-done nil)
(org-node-cache-mode +1)

(message "e2e: Waiting for org-node-cache-mode async scan to complete...")
(let ((max-wait 20)
      (waited 0))
  (while (and (not e2e-scan-done) (< waited max-wait))
    (accept-process-output nil 0.5)
    (setq waited (+ waited 0.5))))

;; 3. Ensure `el-job-ng` has absolutely finished processing everything
(let ((max-wait 5)
      (waited 0))
  (while (and (el-job-ng-busy-p 'org-mem) (< waited max-wait))
    (accept-process-output nil 0.5)
    (setq waited (+ waited 0.5))))

;; 4. Deduplicate parsed links/cache edges internally to avoid CI glitches
(with-memoization (org-mem--table 18 "id")
  (delete-dups (org-mem--table 18 "id")))

;;; Start HTTP server ---------------------------------------------------------

;; Call the internal start function directly so the E2E server does not depend
;; on a pre-built frontend dist/ directory (Playwright uses Vite dev server).
(setq httpd-port org-node-ui-lite-port
      httpd-root e2e/test-dir)
(httpd-start)

(message "e2e: org-node-ui-lite HTTP server listening on port %d" org-node-ui-lite-port)

;;; Event loop and watchdog ---------------------------------------------------

;; Keep Emacs alive so the HTTP server continues to handle requests.
;; We use a timer-based watchdog to check if the httpd process is still alive
;; and listening. In Emacs 30.x, async callbacks (e.g., from org-mem) can
;; sometimes encounter errors that close the network process without removing
;; the process object itself, so we explicitly check `process-status` for `listen`.
(run-with-timer 1 1
                (lambda ()
                  (let ((proc (get-process "httpd")))
                    (when (and proc (not (eq (process-status proc) 'listen)))
                      (delete-process proc)
                      (setq proc nil))
                    (unless proc
                      (message "e2e: httpd not listening, restarting on port %d" httpd-port)
                      (condition-case restart-err
                          (httpd-start)
                        (error (message "e2e: failed to restart httpd: %S" restart-err)))))))

;; Process network I/O and async scan callbacks indefinitely.
;; `condition-case` prevents unhandled async errors from terminating Emacs
;; before Playwright sends SIGTERM. We catch all conditions including `quit`.
(while t
  (condition-case err
      (accept-process-output nil 1)
    (t (message "e2e: non-fatal error in event loop: %S" err))))
