;;; org-node-ui-lite.el --- Lightweight HTTP backend for org-node graph UI  -*- lexical-binding: t; -*-

;; Copyright (C) 2025, 2026  yewton
;;
;; SPDX-License-Identifier: GPL-3.0-or-later
;;
;; Author: yewton
;; URL: https://github.com/yewton/org-node-ui-lite
;; Package-Version: 0.1.0
;; Package-Requires: ((emacs "29.1") (org-mem "0.34") (org-node "1.0") (simple-httpd "1.5.1"))
;; Keywords: hypermedia, tools, org

;; This file is NOT part of GNU Emacs.

;;; Commentary:
;; HTTP server that exposes org-mem node data as JSON for the org-node-ui-lite
;; front-end (compiled to packages/frontend/dist/).
;;
;; ENDPOINTS
;;   GET /api/current-node.json → cursor position {id, seq} for follow-mode
;;   GET /api/graph.json        → all nodes + edges
;;   GET /api/node/<id>.json    → single node, backlinks, raw Org text
;;   GET /api/node/<id>/<path>  → binary asset (Base64url-encoded filename)
;;
;; INTERACTIVE COMMANDS
;;   M-x org-node-ui-lite-select-current
;;       Select the org-node at point in the WebUI regardless of follow-mode.
;;
;; QUICK START
;;   In init.el:
;;     (add-to-list 'load-path "/path/to/org-node-ui-lite")
;;     (require 'org-node-ui-lite)
;;     (org-node-ui-lite-mode +1)
;;
;;   On first run, org-node-ui-lite-mode checks whether the front-end has been
;;   built.  If `npm' is available it runs `npm install && npm run build'
;;   automatically (in the background) and opens the browser when done.
;;   If `npm' is not found, a user-error is raised with manual instructions.

;;; Code:

(require 'cl-lib)
(require 'json)
(require 'simple-httpd)
(require 'org-mem)
(require 'org-node)

;;;; Customization

(defgroup org-node-ui-lite nil
  "Serve org-mem graph data to the org-node-ui-lite front-end."
  :group 'applications)

(defcustom org-node-ui-lite-port 5174
  "TCP port for the HTTP server."
  :type 'integer
  :group 'org-node-ui-lite)

(defcustom org-node-ui-lite-open-on-start t
  "Open a browser window when `org-node-ui-lite-mode' is enabled."
  :type 'boolean
  :group 'org-node-ui-lite)

(defcustom org-node-ui-lite-browser-function #'browse-url
  "Function called with a URL string to open the UI in a browser."
  :type 'function
  :group 'org-node-ui-lite)

(defconst org-node-ui-lite--this-file
  (or load-file-name buffer-file-name)
  "Absolute path to this file at load time.")

;;;; Data helpers

(defun org-node-ui-lite--all-nodes ()
  "Return ((id . ID) (title . TITLE)) alists for every visible ID-node.
Visibility is determined by `org-node-filter-fn', the same predicate
org-node uses for its completion interface."
  (mapcar (lambda (entry)
            `((id    . ,(org-mem-entry-id entry))
              (title . ,(org-mem-entry-title entry))))
          (org-node-all-filtered-nodes)))

(defun org-node-ui-lite--all-edges ()
  "Return ((source . SRC-ID) (dest . DEST-ID)) alists for all ID-links."
  (let (result)
    (dolist (link (org-mem-all-id-links))
      (when-let ((src (org-mem-link-nearby-id link))
                 (dst (org-mem-link-target link)))
        (push `((source . ,src) (dest . ,dst)) result)))
    result))

(defun org-node-ui-lite--entry-raw (entry)
  "Return the raw Org file text for ENTRY.
Uses `org-mem-entry-text' when text caching is enabled; otherwise reads
the full file from disk."
  (if (and (bound-and-true-p org-mem-do-cache-text)
           (org-mem-entry-text entry))
      (org-mem-entry-text entry)
    (with-temp-buffer
      (insert-file-contents (org-mem-entry-file entry))
      (buffer-string))))

(defun org-node-ui-lite--backlinks (id)
  "Return ((source . SRC-ID) (title . TITLE)) alists for backlinks to ID."
  (let (result)
    (dolist (link (org-mem-id-links-to-id id))
      (when-let* ((src-id (org-mem-link-nearby-id link))
                  (src    (org-mem-entry-by-id src-id)))
        (push `((source . ,src-id)
                (title  . ,(org-mem-entry-title src)))
              result)))
    result))

(defun org-node-ui-lite--base64url-decode (str)
  "Decode a Base64url-encoded string STR to plain text."
  (let* ((b64 (replace-regexp-in-string
               "_" "/" (replace-regexp-in-string "-" "+" str)))
         (pad (% (- 4 (mod (length b64) 4)) 4)))
    (base64-decode-string (concat b64 (make-string pad ?=)))))

;;;; HTTP response helpers
;;
;; These functions must be called while `(current-buffer)' is an httpd-buffer
;; (i.e., from inside a defservlet* body).  `httpd-send-header' reads the
;; current buffer for the response body and sets `httpd--header-sent', which
;; prevents `with-httpd-buffer' from sending a duplicate response.

(defun org-node-ui-lite--send-json (proc data &optional status)
  "Respond to PROC with DATA encoded as JSON and STATUS (default 200)."
  (erase-buffer)
  (insert (json-encode data))
  (httpd-send-header proc "application/json; charset=utf-8" (or status 200)
                     :Access-Control-Allow-Origin "*"))

;;;; Cursor tracking and explicit selection

(defvar org-node-ui-lite--current-node-id nil
  "ID of the org-node at point in the active window, or nil.")

(defvar org-node-ui-lite--explicit-seq 0
  "Counter incremented by `org-node-ui-lite-select-current'.
The front-end uses this to detect explicit selection requests.")

(defun org-node-ui-lite--track-current-node ()
  "Update `org-node-ui-lite--current-node-id' based on point in the active buffer."
  (setq org-node-ui-lite--current-node-id
        (when (derived-mode-p 'org-mode)
          (ignore-errors (org-entry-get nil "ID")))))

;;;###autoload
(defun org-node-ui-lite-select-current ()
  "Select the org-node at point in the WebUI.
Works regardless of whether follow-mode is enabled in the browser."
  (interactive)
  (let ((id (when (derived-mode-p 'org-mode)
              (ignore-errors (org-entry-get nil "ID")))))
    (if id
        (progn
          (setq org-node-ui-lite--current-node-id id)
          (cl-incf org-node-ui-lite--explicit-seq)
          (message "org-node-ui-lite: selecting node in WebUI"))
      (message "org-node-ui-lite: no org-node at point"))))

;;;; Servlets

(defservlet* api/current-node.json text/plain ()
  (org-node-ui-lite--send-json
   httpd-current-proc
   `((id  . ,org-node-ui-lite--current-node-id)
     (seq . ,org-node-ui-lite--explicit-seq))))

(defservlet* api/graph.json text/plain ()
  (org-node-ui-lite--send-json
   httpd-current-proc
   `((nodes . ,(vconcat (org-node-ui-lite--all-nodes)))
     (edges . ,(vconcat (org-node-ui-lite--all-edges))))))

;; Unified handler for /api/node/:id.json and /api/node/:id/:path.
;; simple-httpd dispatches on the longest fixed prefix (/api/node/), so
;; both URL shapes must be distinguished inside a single servlet.
(defservlet* api/node/:_part1/:_part2 text/plain ()
  (let* ((parts  (split-string (substring httpd-path 1) "/"))
         ;; parts = ["api" "node" "ID.json"]  or  ["api" "node" "ID" "ASSET"]
         (id-raw (nth 2 parts))
         (asset  (nth 3 parts))
         (proc   httpd-current-proc))
    (cond
     ;; /api/node/:id.json  (3 path components)
     ((and id-raw (or (null asset) (string= asset "")))
      (let* ((node-id (file-name-sans-extension id-raw))
             (entry   (org-mem-entry-by-id node-id)))
        (if (null entry)
            (org-node-ui-lite--send-json proc '((error . "not_found")) 404)
          (org-node-ui-lite--send-json
           proc
           `((id        . ,node-id)
             (title     . ,(org-mem-entry-title entry))
             (raw       . ,(org-node-ui-lite--entry-raw entry))
             (backlinks . ,(vconcat (org-node-ui-lite--backlinks node-id))))))))
     ;; /api/node/:id/:path  (4 path components, Base64url-encoded filename)
     ((and id-raw asset)
      (let* ((entry (org-mem-entry-by-id id-raw)))
        (if (null entry)
            (org-node-ui-lite--send-json proc '((error . "not_found")) 404)
          (let* ((dir      (file-name-directory (org-mem-entry-file entry)))
                 (ext      (file-name-extension asset t))
                 (b64url   (file-name-sans-extension asset))
                 (filename (org-node-ui-lite--base64url-decode b64url))
                 (full     (expand-file-name (concat filename ext) dir)))
            (if (file-exists-p full)
                ;; httpd-send-file calls httpd-discard-buffer, which sets
                ;; httpd--header-sent=t and prevents a double response.
                (httpd-send-file proc full)
              (org-node-ui-lite--send-json proc '((error . "not_found")) 404))))))
     (t
      (org-node-ui-lite--send-json proc '((error . "not_found")) 404)))))

;;;; Setup helpers

(defvar org-node-ui-lite--build-process nil
  "Live `npm run build' process, or nil when no build is in progress.")

(defun org-node-ui-lite--dist-p ()
  "Return non-nil when the compiled front-end exists."
  (file-exists-p
   (expand-file-name "packages/frontend/dist/index.html"
                     (file-name-directory org-node-ui-lite--this-file))))

(defun org-node-ui-lite--check-prerequisites ()
  "Warn about soft issues; signal `user-error' for hard failures."
  (unless (bound-and-true-p org-mem-updater-mode)
    (message (concat "org-node-ui-lite: warning: `org-mem-updater-mode' is not active. "
                     "Node data may be stale. Consider adding "
                     "(org-mem-updater-mode +1) to your init.el."))))

(defun org-node-ui-lite--start-server ()
  "Configure httpd and open the browser.  Called after prerequisites pass."
  (setq httpd-port org-node-ui-lite-port
        httpd-root (expand-file-name "packages/frontend/dist/"
                                     (file-name-directory org-node-ui-lite--this-file)))
  (httpd-start)
  (when org-node-ui-lite-open-on-start
    (funcall org-node-ui-lite-browser-function
             (format "http://localhost:%d/index.html" org-node-ui-lite-port)))
  (message "org-node-ui-lite: http://localhost:%d/index.html" org-node-ui-lite-port))

;;;; Minor mode

;;;###autoload
(define-minor-mode org-node-ui-lite-mode
  "Global minor mode that serves the org-node-ui-lite graph browser.

On first enable, checks whether the front-end has been compiled.
If the `dist/' directory is missing and `npm' is available the build
runs automatically in the background.  When `npm' cannot be found a
`user-error' is raised with manual build instructions."
  :global t
  :group 'org-node-ui-lite
  (cond
   (org-node-ui-lite-mode
    ;; Abort any stale build from a previous enable attempt.
    (when (process-live-p org-node-ui-lite--build-process)
      (kill-process org-node-ui-lite--build-process)
      (setq org-node-ui-lite--build-process nil))
    (condition-case err
        (progn
          (add-hook 'post-command-hook #'org-node-ui-lite--track-current-node)
          (org-node-ui-lite--check-prerequisites)
          (if (org-node-ui-lite--dist-p)
              (org-node-ui-lite--start-server)
            ;; Front-end not built yet — try to build it automatically.
            (let* ((root (file-name-directory org-node-ui-lite--this-file))
                   (npm  (executable-find "npm")))
              (if npm
                  (org-node-ui-lite--build-and-start npm root)
                (user-error
                 "org-node-ui-lite: front-end not built and `npm' not found; \
build manually: cd %s && npm install && npm run build"
                 root)))))
      (error
       (org-node-ui-lite-mode -1)
       (signal (car err) (cdr err)))))
   (t
    (remove-hook 'post-command-hook #'org-node-ui-lite--track-current-node)
    (setq org-node-ui-lite--current-node-id nil
          org-node-ui-lite--explicit-seq 0)
    (when (process-live-p org-node-ui-lite--build-process)
      (kill-process org-node-ui-lite--build-process)
      (setq org-node-ui-lite--build-process nil))
    (httpd-stop)
    (message "org-node-ui-lite stopped"))))

(defun org-node-ui-lite--build-and-start (npm repo-root)
  "Run npm install (if needed) and npm run build asynchronously.
NPM is the absolute path to the npm executable.  REPO-ROOT is the
top-level directory of the org-node-ui-lite checkout.
On success the HTTP server is started; on failure the mode is disabled
and the build output is shown."
  (let* ((has-modules (file-directory-p
                       (expand-file-name "node_modules" repo-root)))
         (npm*   (shell-quote-argument npm))
         (sh-cmd (if has-modules
                     (format "%s --prefix packages/frontend run build" npm*)
                   (format "%s install && %s --prefix packages/frontend run build"
                           npm* npm*)))
         (buf (get-buffer-create "*org-node-ui-lite-build*")))
    (with-current-buffer buf (erase-buffer))
    (message "org-node-ui-lite: %s front-end (this may take a minute)…"
             (if has-modules "Building" "Installing dependencies and building"))
    (setq org-node-ui-lite--build-process
          (let ((default-directory repo-root))
            (make-process
             :name "org-node-ui-lite-build"
             :buffer buf
             :noquery t
             :command (list shell-file-name shell-command-switch sh-cmd)
             :sentinel
             (lambda (_proc event)
               (setq org-node-ui-lite--build-process nil)
               (if (string-match-p "finished" event)
                   (progn
                     (message "org-node-ui-lite: Build complete.")
                     ;; Only start if the user hasn't disabled the mode meanwhile.
                     (when org-node-ui-lite-mode
                       (org-node-ui-lite--start-server)))
                 (org-node-ui-lite-mode -1)
                 (display-buffer (get-buffer "*org-node-ui-lite-build*"))
                 (message (concat "org-node-ui-lite: Build failed — "
                                  "see buffer *org-node-ui-lite-build*")))))))))

(provide 'org-node-ui-lite)
;;; org-node-ui-lite.el ends here
