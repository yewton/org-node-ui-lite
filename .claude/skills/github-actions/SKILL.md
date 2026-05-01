---
name: github-actions-practices
description: Best practices for GitHub Actions in this repository. Use when modifying or creating GitHub Actions workflows.
---

# GitHub Actions Best Practices

- **Versioning:** Pin GitHub Actions to their exact SHA-1 commit hashes instead of version tags. Retain the version tag as a comment.
- **`workflow_run` Context:** When using `workflow_run` triggered by PRs, context variables point to the default branch. Tools like `actions/checkout` and `dorny/paths-filter` must use explicit `ref` and `base` inputs (e.g., `ref: ${{ github.event.workflow_run.head_branch }}`) to correctly target the PR branch instead of `main`.
