;;; org-node-ui-lite-test.el --- ERT tests for org-node-ui-lite  -*- lexical-binding: t; -*-

;; SPDX-License-Identifier: GPL-3.0-or-later

;;; Code:

(require 'ert)
(require 'org-node-ui-lite)

;;;; org-node-ui-lite--base64url-decode

(ert-deftest org-node-ui-lite--base64url-decode/one-padding-char ()
  (should (string= "hello" (org-node-ui-lite--base64url-decode "aGVsbG8"))))

(ert-deftest org-node-ui-lite--base64url-decode/two-padding-chars ()
  (should (string= "test" (org-node-ui-lite--base64url-decode "dGVzdA"))))

(ert-deftest org-node-ui-lite--base64url-decode/url-safe-minus ()
  (should (string= "~~~" (org-node-ui-lite--base64url-decode "fn5-"))))

(ert-deftest org-node-ui-lite--base64url-decode/longer-string ()
  (should (string= "diagram" (org-node-ui-lite--base64url-decode "ZGlhZ3JhbQ"))))

;;;; org-node-ui-lite--all-nodes
;;
;; org-mem-entry has :title-maybe (not :title); org-mem-entry-title is a
;; separate function (not a struct accessor) that reads title-maybe.
;; Only mock the list-returning function; use real struct instances.

(ert-deftest org-node-ui-lite--all-nodes/maps-to-id-title-alists ()
  (let ((e1 (make-org-mem-entry :id "id1" :title-maybe "Alpha"))
        (e2 (make-org-mem-entry :id "id2" :title-maybe "Beta")))
    (cl-letf (((symbol-function 'org-node-all-filtered-nodes)
               (lambda () (list e1 e2))))
      (let ((result (org-node-ui-lite--all-nodes)))
        (should (= 2 (length result)))
        (should (string= "id1"   (alist-get 'id    (nth 0 result))))
        (should (string= "Alpha" (alist-get 'title (nth 0 result))))
        (should (string= "id2"   (alist-get 'id    (nth 1 result))))
        (should (string= "Beta"  (alist-get 'title (nth 1 result))))))))

(ert-deftest org-node-ui-lite--all-nodes/empty-when-no-nodes ()
  (cl-letf (((symbol-function 'org-node-all-filtered-nodes) (lambda () nil)))
    (should (null (org-node-ui-lite--all-nodes)))))

;;;; org-node-ui-lite--all-edges

(ert-deftest org-node-ui-lite--all-edges/maps-links-to-source-dest-alists ()
  (let ((link (make-org-mem-link :nearby-id "s1" :target "d1")))
    (cl-letf (((symbol-function 'org-mem-all-id-links)
               (lambda () (list link))))
      (let ((result (org-node-ui-lite--all-edges)))
        (should (= 1 (length result)))
        (should (string= "s1" (alist-get 'source (car result))))
        (should (string= "d1" (alist-get 'dest   (car result))))))))

(ert-deftest org-node-ui-lite--all-edges/skips-links-without-nearby-id ()
  (let ((link1 (make-org-mem-link :nearby-id nil  :target "d1"))
        (link2 (make-org-mem-link :nearby-id "s2" :target "d2")))
    (cl-letf (((symbol-function 'org-mem-all-id-links)
               (lambda () (list link1 link2))))
      (let ((result (org-node-ui-lite--all-edges)))
        (should (= 1 (length result)))
        (should (string= "s2" (alist-get 'source (car result))))
        (should (string= "d2" (alist-get 'dest   (car result))))))))

;;;; org-node-ui-lite--backlinks

(ert-deftest org-node-ui-lite--backlinks/returns-source-id-and-title ()
  (let ((entry1 (make-org-mem-entry :id "src1" :title-maybe "Title:src1"))
        (entry2 (make-org-mem-entry :id "src2" :title-maybe "Title:src2"))
        (link1  (make-org-mem-link :nearby-id "src1"))
        (link2  (make-org-mem-link :nearby-id "src2")))
    (cl-letf (((symbol-function 'org-mem-id-links-to-id)
               (lambda (_id) (list link1 link2)))
              ((symbol-function 'org-mem-entry-by-id)
               (lambda (id)
                 (cond ((string= id "src1") entry1)
                       ((string= id "src2") entry2)))))
      (let ((result (org-node-ui-lite--backlinks "target")))
        (should (= 2 (length result)))
        ;; dolist+push reverses order; src2 ends up first
        (should (string= "src2"       (alist-get 'source (nth 0 result))))
        (should (string= "Title:src2" (alist-get 'title  (nth 0 result))))
        (should (string= "src1"       (alist-get 'source (nth 1 result))))))))

(ert-deftest org-node-ui-lite--backlinks/skips-links-whose-source-entry-is-missing ()
  (let ((real-entry (make-org-mem-entry :id "real" :title-maybe "Real Node"))
        (ghost-link (make-org-mem-link :nearby-id "ghost"))
        (real-link  (make-org-mem-link :nearby-id "real")))
    (cl-letf (((symbol-function 'org-mem-id-links-to-id)
               (lambda (_id) (list ghost-link real-link)))
              ((symbol-function 'org-mem-entry-by-id)
               (lambda (id) (when (string= id "real") real-entry))))
      (let ((result (org-node-ui-lite--backlinks "target")))
        (should (= 1 (length result)))
        (should (string= "real"      (alist-get 'source (car result))))
        (should (string= "Real Node" (alist-get 'title  (car result))))))))

;;;; org-node-ui-lite--entry-raw
;;
;; org-mem-entry-text and org-mem-entry-file are regular functions (not struct
;; accessors), so cl-letf can mock them even when org-node-ui-lite.el is compiled.

(ert-deftest org-node-ui-lite--entry-raw/returns-cached-text-when-available ()
  (cl-letf (((symbol-function 'org-mem-entry-text) (lambda (_e) "* Cached\n")))
    (let ((entry (make-org-mem-entry))
          (org-mem-do-cache-text t))
      (should (string= "* Cached\n" (org-node-ui-lite--entry-raw entry))))))

(ert-deftest org-node-ui-lite--entry-raw/reads-file-when-cache-disabled ()
  (let ((tmpfile (make-temp-file "org-node-ui-lite-test-" nil ".org")))
    (unwind-protect
        (progn
          (with-temp-file tmpfile (insert "* From file\n"))
          (cl-letf (((symbol-function 'org-mem-entry-file) (lambda (_e) tmpfile)))
            (let ((entry (make-org-mem-entry))
                  (org-mem-do-cache-text nil))
              (should (string= "* From file\n"
                               (org-node-ui-lite--entry-raw entry))))))
      (delete-file tmpfile))))

;;;; org-node-ui-lite--track-current-node

(ert-deftest org-node-ui-lite--track-current-node/sets-id-in-org-buffer ()
  "Sets the variable to the ID of the current heading."
  (cl-letf (((symbol-function 'derived-mode-p) (lambda (&rest _) t))
            ((symbol-function 'org-entry-get-with-inheritance) (lambda (prop &optional _literal-nil _epom) (when (equal prop "ID") "abc-123"))))
    (let ((org-node-ui-lite--current-node-id nil))
      (org-node-ui-lite--track-current-node)
      (should (string= "abc-123" org-node-ui-lite--current-node-id)))))

(ert-deftest org-node-ui-lite--track-current-node/sets-nil-outside-org ()
  "Resets the variable to nil when not in an Org buffer."
  (cl-letf (((symbol-function 'derived-mode-p) (lambda (&rest _) nil)))
    (let ((org-node-ui-lite--current-node-id "stale-id"))
      (org-node-ui-lite--track-current-node)
      (should (null org-node-ui-lite--current-node-id)))))

(ert-deftest org-node-ui-lite--track-current-node/sets-nil-when-heading-has-no-id ()
  "Resets the variable to nil when the heading has no :ID: property anywhere in the hierarchy."
  (cl-letf (((symbol-function 'derived-mode-p) (lambda (&rest _) t))
            ((symbol-function 'org-entry-get-with-inheritance) (lambda (_prop &optional _literal-nil _epom) nil)))
    (let ((org-node-ui-lite--current-node-id "stale-id"))
      (org-node-ui-lite--track-current-node)
      (should (null org-node-ui-lite--current-node-id)))))

;;;; org-node-ui-lite-select-current

(ert-deftest org-node-ui-lite-select-current/increments-seq-and-sets-id ()
  "Increments the explicit-seq counter and updates the current node ID."
  (cl-letf (((symbol-function 'derived-mode-p) (lambda (&rest _) t))
            ((symbol-function 'org-entry-get-with-inheritance) (lambda (prop &optional _literal-nil _epom) (when (equal prop "ID") "node-42"))))
    (let ((org-node-ui-lite--current-node-id nil)
          (org-node-ui-lite--explicit-seq 0))
      (org-node-ui-lite-select-current)
      (should (string= "node-42" org-node-ui-lite--current-node-id))
      (should (= 1 org-node-ui-lite--explicit-seq)))))

(ert-deftest org-node-ui-lite-select-current/does-nothing-outside-org ()
  "Does not change seq or id when not in an Org buffer."
  (cl-letf (((symbol-function 'derived-mode-p) (lambda (&rest _) nil)))
    (let ((org-node-ui-lite--current-node-id "existing-id")
          (org-node-ui-lite--explicit-seq 5))
      (org-node-ui-lite-select-current)
      (should (string= "existing-id" org-node-ui-lite--current-node-id))
      (should (= 5 org-node-ui-lite--explicit-seq)))))

(ert-deftest org-node-ui-lite-select-current/does-nothing-when-no-id-at-point ()
  "Does not change seq or id when the heading has no :ID: property anywhere in the hierarchy."
  (cl-letf (((symbol-function 'derived-mode-p) (lambda (&rest _) t))
            ((symbol-function 'org-entry-get-with-inheritance) (lambda (_prop &optional _literal-nil _epom) nil)))
    (let ((org-node-ui-lite--current-node-id "existing-id")
          (org-node-ui-lite--explicit-seq 3))
      (org-node-ui-lite-select-current)
      (should (string= "existing-id" org-node-ui-lite--current-node-id))
      (should (= 3 org-node-ui-lite--explicit-seq)))))


(provide 'org-node-ui-lite-test)
;;; org-node-ui-lite-test.el ends here
