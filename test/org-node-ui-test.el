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

(ert-deftest org-node-ui--all-nodes/maps-to-id-title-alists ()
  (cl-letf (((symbol-function 'org-node-all-filtered-nodes)
             (lambda () (list '(:id "id1" :title "Alpha")
                              '(:id "id2" :title "Beta"))))
            ((symbol-function 'org-mem-entry-id)    (lambda (e) (plist-get e :id)))
            ((symbol-function 'org-mem-entry-title) (lambda (e) (plist-get e :title))))
    (let ((result (org-node-ui--all-nodes)))
      (should (= 2 (length result)))
      (should (string= "id1"   (alist-get 'id    (nth 0 result))))
      (should (string= "Alpha" (alist-get 'title (nth 0 result))))
      (should (string= "id2"   (alist-get 'id    (nth 1 result))))
      (should (string= "Beta"  (alist-get 'title (nth 1 result)))))))

(ert-deftest org-node-ui--all-nodes/empty-when-no-nodes ()
  (cl-letf (((symbol-function 'org-node-all-filtered-nodes) (lambda () nil)))
    (should (null (org-node-ui--all-nodes)))))

;;;; org-node-ui--all-edges

(ert-deftest org-node-ui--all-edges/maps-links-to-source-dest-alists ()
  (cl-letf (((symbol-function 'org-mem-all-id-links)
             (lambda () (list '(:src "s1" :dst "d1"))))
            ((symbol-function 'org-mem-link-nearby-id) (lambda (l) (plist-get l :src)))
            ((symbol-function 'org-mem-link-target)    (lambda (l) (plist-get l :dst))))
    (let ((result (org-node-ui--all-edges)))
      (should (= 1 (length result)))
      (should (string= "s1" (alist-get 'source (car result))))
      (should (string= "d1" (alist-get 'dest   (car result)))))))

(ert-deftest org-node-ui--all-edges/skips-links-without-nearby-id ()
  (cl-letf (((symbol-function 'org-mem-all-id-links)
             (lambda () (list '(:src nil :dst "d1")
                              '(:src "s2" :dst "d2"))))
            ((symbol-function 'org-mem-link-nearby-id) (lambda (l) (plist-get l :src)))
            ((symbol-function 'org-mem-link-target)    (lambda (l) (plist-get l :dst))))
    (let ((result (org-node-ui--all-edges)))
      (should (= 1 (length result)))
      (should (string= "s2" (alist-get 'source (car result))))
      (should (string= "d2" (alist-get 'dest   (car result)))))))

;;;; org-node-ui--backlinks

(ert-deftest org-node-ui--backlinks/returns-source-id-and-title ()
  (cl-letf (((symbol-function 'org-mem-id-links-to-id)
             (lambda (_id) (list '(:src "src1") '(:src "src2"))))
            ((symbol-function 'org-mem-link-nearby-id) (lambda (l) (plist-get l :src)))
            ((symbol-function 'org-mem-entry-by-id)
             (lambda (id) (list :id id :title (concat "Title:" id))))
            ((symbol-function 'org-mem-entry-title)
             (lambda (e) (plist-get e :title))))
    (let ((result (org-node-ui--backlinks "target")))
      (should (= 2 (length result)))
      ;; dolist+push reverses order; src2 ends up first
      (should (string= "src2"        (alist-get 'source (nth 0 result))))
      (should (string= "Title:src2"  (alist-get 'title  (nth 0 result))))
      (should (string= "src1"        (alist-get 'source (nth 1 result)))))))

(ert-deftest org-node-ui--backlinks/skips-links-whose-source-entry-is-missing ()
  (cl-letf (((symbol-function 'org-mem-id-links-to-id)
             (lambda (_id) (list '(:src "ghost") '(:src "real"))))
            ((symbol-function 'org-mem-link-nearby-id) (lambda (l) (plist-get l :src)))
            ((symbol-function 'org-mem-entry-by-id)
             (lambda (id) (when (string= id "real")
                            (list :id "real" :title "Real Node"))))
            ((symbol-function 'org-mem-entry-title)
             (lambda (e) (plist-get e :title))))
    (let ((result (org-node-ui--backlinks "target")))
      (should (= 1 (length result)))
      (should (string= "real"      (alist-get 'source (car result))))
      (should (string= "Real Node" (alist-get 'title  (car result)))))))

;;;; org-node-ui--entry-raw

(ert-deftest org-node-ui--entry-raw/returns-cached-text-when-available ()
  (cl-letf (((symbol-function 'org-mem-entry-text) (lambda (_e) "* Cached\n")))
    (let ((org-mem-do-cache-text t))
      (should (string= "* Cached\n" (org-node-ui--entry-raw '()))))))

(ert-deftest org-node-ui--entry-raw/reads-file-when-cache-disabled ()
  (let ((tmpfile (make-temp-file "org-node-ui-test-" nil ".org")))
    (unwind-protect
        (progn
          (with-temp-file tmpfile (insert "* From file\n"))
          (cl-letf (((symbol-function 'org-mem-entry-text) (lambda (_e) nil))
                    ((symbol-function 'org-mem-entry-file) (lambda (_e) tmpfile)))
            (let ((org-mem-do-cache-text nil))
              (should (string= "* From file\n"
                               (org-node-ui--entry-raw '()))))))
      (delete-file tmpfile))))

(provide 'org-node-ui-test)
;;; org-node-ui-test.el ends here
