---
description: APM policy rules for AI agents modifying skills and instructions.
applyTo: "**"
---

# APM Policy

When using the Agent Package Manager (APM) in this repository, you must follow these policies:

1. **Modify Source Files Only**: Always edit files inside the `.apm/` directory (e.g., `.apm/skills/<name>/SKILL.md` or `.apm/instructions/*.instructions.md`). **Never** directly edit files in deployed agent directories such as `.claude/`, `.github/`, `.cursor/`, `.gemini/`, `.opencode/`, or `.agents/`.

2. **Re-deploy After Changes**: After modifying any file under `.apm/`, you MUST run `apm install` to regenerate the distributed files across all agent target directories.

3. **Commit Lockfile**: Ensure `apm.lock.yaml` is committed along with your source and deployed files, as the CI job `verify-apm` relies on the lockfile hashes to verify the PR.
