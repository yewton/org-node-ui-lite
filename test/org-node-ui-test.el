;;; org-node-ui-test.el --- ERT tests for org-node-ui  -*- lexical-binding: t; -*-

;; SPDX-License-Identifier: GPL-3.0-or-later

;;; Code:

(require 'ert)
(require 'org-node-ui)

;;;; org-node-ui--base64url-decode

(ert-deftest org-node-ui--base64url-decode/one-padding-char ()
  ;; base64("hello") = "aGVsbG8=" -> base64url: "aGVsbG8"
  (should (string= "hello" (org-node-ui--base64url-decode "aGVsbG8"))))

(ert-deftest org-node-ui--base64url-decode/two-padding-chars ()
  ;; base64("test") = "dGVzdA==" -> base64url: "dGVzdA"
  (should (string= "test" (org-node-ui--base64url-decode "dGVzdA"))))

(ert-deftest org-node-ui--base64url-decode/url-safe-minus ()
  ;; base64url uses '-' where standard base64 uses '+'
  ;; base64("~~~") = "fn5+" -> base64url: "fn5-"
  (should (string= "~~~" (org-node-ui--base64url-decode "fn5-"))))

(ert-deftest org-node-ui--base64url-decode/longer-string ()
  ;; base64("diagram") = "ZGlhZ3JhbQ==" -> base64url: "ZGlhZ3JhbQ"
  (should (string= "diagram" (org-node-ui--base64url-decode "ZGlhZ3JhbQ"))))

;;;; org-node-ui--all-nodes
;;
;; cl-defstruct accessors (org-mem-entry-id, org-mem-entry-title, ...) carry
;; type guards that cl-letf cannot bypass.  Create real struct instances via
;; make-org-mem-entry and mock only the list-returning function.

(ert-deftest org-node-ui--all-nodes/maps-to-id-title-alists ()
  (let ((e1 (make-org-mem-entry :id "id1" :title-maybe "Alpha"))
        (e2 (make-org-mem-entry :id "id2" :title-maybe "Beta")))
    (cl-letf (((symbol-function 'org-node-all-filtered-nodes)
               (lambda () (list e1 e2))))
      (let ((result (org-node-ui--all-nodes)))
        (should (= 2 (length result)))
        (should (string= "id1"   (alist-get 'id    (nth 0 result))))
        (should (string= "Alpha" (alist-get 'title (nth 0 result))))
        (should (string= "id2"   (alist-get 'id    (nth 1 result))))
        (should (string= "Beta"  (alist-get 'title (nth 1 result))))))))

(ert-deftest org-node-ui--all-nodes/empty-when-no-nodes ()
  (cl-letf (((symbol-function 'org-node-all-filtered-nodes) (lambda () nil)))
    (should (null (org-node-ui--all-nodes)))))

;;;; org-node-ui--all-edges

(ert-deftest org-node-ui--all-edges/maps-links-to-source-dest-alists ()
  (let ((link (make-org-mem-link :nearby-id "s1" :target "d1")))
    (cl-letf (((symbol-function 'org-mem-all-id-links)
               (lambda () (list link))))
      (let ((result (org-node-ui--all-edges)))
        (should (= 1 (length result)))
        (should (string= "s1" (alist-get 'source (car result))))
        (should (string= "d1" (alist-get 'dest   (car result))))))))

(ert-deftest org-node-ui--all-edges/skips-links-without-nearby-id ()
  (let ((link1 (make-org-mem-link :nearby-id nil  :target "d1"))
        (link2 (make-org-mem-link :nearby-id "s2" :target "d2")))
    (cl-letf (((symbol-function 'org-mem-all-id-links)
               (lambda () (list link1 link2))))
      (let ((result (org-node-ui--all-edges)))
        (should (= 1 (length result)))
        (should (string= "s2" (alist-get 'source (car result))))
        (should (string= "d2" (alist-get 'dest   (car result))))))))

;;;; org-node-ui--backlinks

(ert-deftest org-node-ui--backlinks/returns-source-id-and-title ()
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
      (let ((result (org-node-ui--backlinks "target")))
        (should (= 2 (length result)))
        ;; dolist+push reverses order; src2 ends up first
        (should (string= "src2"       (alist-get 'source (nth 0 result))))
        (should (string= "Title:src2" (alist-get 'title  (nth 0 result))))
        (should (string= "src1"       (alist-get 'source (nth 1 result))))))))

(ert-deftest org-node-ui--backlinks/skips-links-whose-source-entry-is-missing ()
  (let ((real-entry (make-org-mem-entry :id "real" :title-maybe "Real Node"))
        (ghost-link (make-org-mem-link :nearby-id "ghost"))
        (real-link  (make-org-mem-link :nearby-id "real")))
    (cl-letf (((symbol-function 'org-mem-id-links-to-id)
               (lambda (_id) (list ghost-link real-link)))
              ((symbol-function 'org-mem-entry-by-id)
               (lambda (id) (when (string= id "real") real-entry))))
      (let ((result (org-node-ui--backlinks "target")))
        (should (= 1 (length result)))
        (should (string= "real"      (alist-get 'source (car result))))
        (should (string= "Real Node" (alist-get 'title  (car result))))))))

;;;; org-node-ui--entry-raw

(ert-deftest org-node-ui--entry-raw/returns-cached-text-when-available ()
  (let ((entry (make-org-mem-entry))
        (org-mem-do-cache-text t))
    (cl-letf (((symbol-function 'org-mem-entry-text)
               (lambda (_e) "* Cached\n")))
      (should (string= "* Cached\n" (org-node-ui--entry-raw entry))))))

(ert-deftest org-node-ui--entry-raw/reads-file-when-cache-disabled ()
  (let ((tmpfile (make-temp-file "org-node-ui-test-" nil ".org")))
    (unwind-protect
        (progn
          (with-temp-file tmpfile (insert "* From file\n"))
          (let ((entry (make-org-mem-entry :file-truename tmpfile))
                (org-mem-do-cache-text nil))
            (should (string= "* From file\n"
                             (org-node-ui--entry-raw entry)))))
      (delete-file tmpfile))))

(provide 'org-node-ui-test)
;;; org-node-ui-test.el ends here
