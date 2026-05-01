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
apm install

# 3. Commit source, deployed files, and lockfile together
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

## CI verification

`apm audit --ci` (run in the `verify-apm` CI job) checks that all deployed
files match the lockfile hashes. The PR is blocked if `.apm/` was edited
without running `apm install`.

## Policy

APM supports org-level governance via `apm-policy.yml`, but this is an
enterprise feature for multi-team organizations. This project does not use it.
