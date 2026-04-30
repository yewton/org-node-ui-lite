# Emacs Testing Best Practices

- **Testing Interactive Prompts:** Avoid mocking interactive prompts (like `yes-or-no-p`) for synchronous test execution. Instead, favor approaches like state polling or explicitly loading files.
