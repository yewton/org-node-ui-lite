;;; org-node-ui.el --- Lightweight HTTP backend for org-node-ui  -*- lexical-binding: t; -*-

;; Copyright (C) 2025  Contributors
;;
;; URL: https://github.com/yewton/org-node-ui-lite
;; Package-Version: 0.1.0
;; Package-Requires: ((emacs "29.1") (org-mem "0.34") (org-node "1.0") (simple-httpd "1.5.1"))
;; Keywords: hypermedia, tools, org
;; SPDX-License-Identifier: GPL-3.0-or-later

;; This file is NOT part of GNU Emacs.

;;; Commentary:
;; Turns Emacs into a tiny JSON API server for the org-node-ui front-end
;; (compiled into packages/frontend/dist/).
;;
;; Uses org-mem for data access instead of org-roam, so there is no
;; dependency on org-roam or its SQLite database.
;;
;; ENDPOINTS
;;  GET /api/graph.json        → full graph of ID-nodes and links
;;  GET /api/node/<id>.json    → single node payload or 404
;;  GET /api/node/<id>/<path>  → binary asset from the note directory
;;
;; QUICK START
;;  1.  Build the front-end once:
;;        cd packages/frontend && npm install && npm run build
;;  2.  Add to init.el:
;;        (require 'org-node-ui)
;;        (org-node-ui-mode 1)
;;  3.  Browse to http://localhost:5174/index.html

;;; Code:

(require 'cl-lib)
(require 'json)
(require 'simple-httpd)
(require 'org-mem)
(require 'org-node)

;;;; Customization

(defgroup org-node-ui nil
  "Serve org-node graph data to the org-node-ui front-end."
  :group 'applications)

(defcustom org-node-ui-port 5174
  "TCP port for the JSON server."
  :type 'integer
  :group 'org-node-ui)

(defcustom org-node-ui-open-on-start t
  "When non-nil, open the browser when the server starts."
  :type 'boolean
  :group 'org-node-ui)

(defcustom org-node-ui-browser-function #'browse-url
  "Function called with the server URL to open a browser."
  :type 'function
  :group 'org-node-ui)

(defcustom org-node-ui-exclude-tags '("ROAM_EXCLUDE")
  "Nodes tagged with any of these strings are excluded from the graph."
  :type '(repeat string)
  :group 'org-node-ui)

(defconst org-node-ui--this-file
  (or load-file-name buffer-file-name)
  "Absolute path to org-node-ui.el.")

(defconst org-node-ui--project-root
  (file-name-directory org-node-ui--this-file))

(defcustom org-node-ui-static-root
  (expand-file-name "packages/frontend/dist/" org-node-ui--project-root)
  "Directory containing index.html and the compiled front-end assets."
  :type 'directory
  :group 'org-node-ui)

;;;; Helpers

(defun org-node-ui--json (proc body &optional status)
  "Send BODY as JSON to PROC with optional STATUS (default 200) and CORS header."
  (let ((status (or status 200)))
    (with-httpd-buffer proc "application/json; charset=utf-8"
      (setq httpd--header-sent nil)
      (httpd-send-header proc "application/json; charset=utf-8" status
                         :Access-Control-Allow-Origin "*")
      (insert (json-encode body)))))

(defun org-node-ui--decode-base64url (b64url)
  "Decode URL-safe Base64 string B64URL to a plain string."
  (let* ((s (replace-regexp-in-string
             "-" "+"
             (replace-regexp-in-string "_" "/" b64url)))
         (pad (% (- 4 (mod (length s) 4)) 4))
         (s-padded (concat s (make-string pad ?=))))
    (with-temp-buffer
      (insert s-padded)
      (base64-decode-region (point-min) (point-max))
      (buffer-string))))

;;;; Graph data

(defun org-node-ui--all-nodes ()
  "Return ((id . ID) (title . TITLE)) for each non-excluded ID-node."
  (let (result)
    (dolist (entry (org-mem-all-id-nodes) result)
      (unless (cl-intersection org-node-ui-exclude-tags
                               (org-mem-entry-tags entry)
                               :test #'string=)
        (push `((id . ,(org-mem-entry-id entry))
                (title . ,(org-mem-entry-title entry)))
              result)))))

(defun org-node-ui--all-edges ()
  "Return ((source . SRC-ID) (dest . DEST-ID)) for each ID-link."
  (mapcar (lambda (link)
            `((source . ,(org-mem-link-nearby-id link))
              (dest   . ,(org-mem-link-target link))))
          (org-mem-all-id-links)))

(defun org-node-ui--entry-raw (entry)
  "Return the Org source text for ENTRY.
Uses the cached text from org-mem when available, otherwise reads the file."
  (or (org-mem-entry-text entry)
      (let ((file (org-mem-entry-file entry)))
        (and file
             (file-readable-p file)
             (with-temp-buffer
               (insert-file-contents file)
               (buffer-string))))))

(defun org-node-ui--backlinks (id)
  "Return ((source . SRC-ID) (title . TITLE)) for each backlink to ID."
  (let (result)
    (dolist (link (org-mem-id-links-to-id id) result)
      (let* ((src-id (org-mem-link-nearby-id link))
             (src-entry (and src-id (org-mem-entry-by-id src-id))))
        (when src-entry
          (push `((source . ,src-id)
                  (title  . ,(org-mem-entry-title src-entry)))
                result))))))

;;;; API servlets

(defservlet* api/graph.json application/json ()
  (org-node-ui--json
   proc
   `((nodes . ,(vconcat (org-node-ui--all-nodes)))
     (edges . ,(vconcat (org-node-ui--all-edges))))))

;; Handles both /api/node/:id.json and /api/node/:id/:asset-path.
;; simple-httpd dispatches by longest-prefix match, so a single servlet
;; registered under /api/node/ catches both URL shapes; we dispatch manually.
(defservlet* api/node/:part1/:part2 nil ()
  (let* ((components (split-string (substring httpd-path 1) "/"))
         (n (length components))
         (id-part   (nth 2 components))
         (path-part (nth 3 components)))
    (cond
     ;; /api/node/:id/:asset-path  — four path components
     ((and (= n 4) id-part path-part)
      (let ((entry (org-mem-entry-by-id id-part)))
        (if (null entry)
            (org-node-ui--json proc '((error . "not_found")) 404)
          (let* ((dir      (file-name-directory (org-mem-entry-file entry)))
                 (ext      (file-name-extension path-part t))
                 (b64url   (file-name-sans-extension path-part))
                 (decoded  (org-node-ui--decode-base64url b64url))
                 (rel      (concat decoded ext))
                 (full     (expand-file-name rel dir)))
            (if (file-readable-p full)
                (httpd-send-file proc full)
              (org-node-ui--json proc '((error . "not_found")) 404))))))

     ;; /api/node/:id.json  — three path components
     ((and (= n 3) id-part)
      (let* ((node-id (file-name-sans-extension id-part))
             (entry   (org-mem-entry-by-id node-id)))
        (if (null entry)
            (org-node-ui--json proc '((error . "not_found")) 404)
          (org-node-ui--json
           proc
           `((id        . ,node-id)
             (title     . ,(org-mem-entry-title entry))
             (raw       . ,(or (org-node-ui--entry-raw entry) ""))
             (backlinks . ,(vconcat (org-node-ui--backlinks node-id))))))))

     (t
      (org-node-ui--json proc '((error . "not_found")) 404)))))

;;;; Minor mode

;;;###autoload
(define-minor-mode org-node-ui-mode
  "Toggle the org-node-ui graph server.
When enabled, starts a simple-httpd server on `org-node-ui-port' serving the
front-end SPA and the JSON API backed by org-mem."
  :global t
  :group 'org-node-ui
  (if org-node-ui-mode
      (progn
        (setq httpd-root org-node-ui-static-root
              httpd-port org-node-ui-port)
        (httpd-start)
        (when org-node-ui-open-on-start
          (funcall org-node-ui-browser-function
                   (format "http://localhost:%d/index.html" org-node-ui-port)))
        (message "org-node-ui started → http://localhost:%d/index.html"
                 org-node-ui-port))
    (httpd-stop)
    (message "org-node-ui stopped")))

(provide 'org-node-ui)
;;; org-node-ui.el ends here
