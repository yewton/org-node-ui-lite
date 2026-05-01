---
name: emacs-testing-practices
description: Best practices for Emacs Lisp testing in this repository. Use when writing or debugging Elisp tests.
---

# Emacs Testing Best Practices

- **Testing Interactive Prompts:** Avoid mocking interactive prompts (like `yes-or-no-p`) for synchronous test execution. Instead, favor approaches like state polling or explicitly loading files.
