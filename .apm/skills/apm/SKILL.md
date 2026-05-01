---
name: apm
description: How to manage agent primitives (skills and instructions) via Agent Package Manager. Use when adding, editing, or removing skills or instructions.
---

# Agent Package Manager (APM) Workflow

## Key principle

`.apm/` is the single source of truth. Never edit deployed files directly.

| Directory | Role |
|-----------|------|
| `.apm/skills/<name>/SKILL.md` | Canonical source for skills |
| `.apm/instructions/*.instructions.md` | Canonical source for instructions |
| `.claude/skills/`, `.claude/rules/` | Deployed by APM — do not edit |
| `.github/skills/`, `.github/instructions/` | Deployed by APM — do not edit |

## Workflow

```sh
# 1. Edit or add files under .apm/
# 2. Re-deploy to all agent directories (targets defined in apm.yml)
#    apm install enforces the org-level policy from <org>/.github/apm-policy.yml
#    by default. Since this project has no org-level policy, it falls through
#    silently. The project-level apm-policy.yml is enforced by `apm audit` instead.
apm install

# 3. Verify policy compliance locally (optional but recommended)
apm audit --policy ./apm-policy.yml

# 4. Commit source, deployed files, and lockfile together
git add .apm/ .claude/ .github/instructions/ .github/skills/ apm.lock.yaml
git commit -m "..."
```

## File formats

**Skill** (`.apm/skills/<name>/SKILL.md`):
```markdown
---
name: skill-name          # required, lowercase-hyphenated
description: One line — what it does and when to invoke it.
---

# Instructions ...
```

**Instruction** (`.apm/instructions/<name>.instructions.md`):
```markdown
---
description: What these instructions cover.
applyTo: "glob/pattern/**"   # omit for global (applies everywhere)
---

# Instructions ...
```

## Policy

`apm-policy.yml` (project root) defines the governance rules enforced by CI:

- **No external APM dependencies** — `dependencies.deny: ["*"]`
- **No MCP servers** — `mcp.self_defined: deny`
- **Allowed targets** — claude, copilot, gemini, cursor, opencode, codex
- **No scripts** — `manifest.scripts: deny`

## CI verification

`apm audit --ci --policy ./apm-policy.yml` (run in the `verify-apm` CI job)
checks that all deployed files match the lockfile hashes and that the project
conforms to the policy rules. The PR is blocked if `.apm/` was edited without
running `apm install`.
