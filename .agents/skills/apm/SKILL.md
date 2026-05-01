---
name: apm
description: How to manage agent primitives (skills and instructions) via Agent Package Manager. Use when adding, editing, or removing skills or instructions.
---

# Agent Package Manager (APM) Workflow

## Key principle

`.apm/` is the single source of truth. Never edit deployed or compiled files
directly.

| Directory / file | Role |
|------------------|------|
| `.apm/skills/<name>/SKILL.md` | Canonical source for skills |
| `.apm/instructions/*.instructions.md` | Canonical source for instructions |
| `.claude/skills/`, `.claude/rules/` | Deployed by `apm install` — do not edit |
| `.github/skills/`, `.github/instructions/` | Deployed by `apm install` — do not edit |
| `.gemini/skills/`, `.cursor/`, `.opencode/`, `.agents/` | Deployed by `apm install` — do not edit |
| `AGENTS.md`, `GEMINI.md`, `packages/frontend/src/AGENTS.md` | Compiled by `apm compile` — do not edit |

## Two commands, two responsibilities

`apm install` and `apm compile` solve different problems and both must run:

- **`apm install`** deploys skills, commands, hooks, and MCP config into
  agent-native directories (`.claude/`, `.github/`, `.gemini/`, …).
  GitHub Copilot, Claude, Cursor, and OpenCode read these directly.
- **`apm compile`** rolls instructions up into a single context file per agent
  for tools that don't read deployed primitives natively. **Gemini and Codex
  require this step** — without it `GEMINI.md` / `AGENTS.md` go stale and
  those agents see outdated rules.

`CLAUDE.md` is hand-written project documentation in this repo; we do not
compile it. Only `gemini` and `codex` are passed to `apm compile`.

## Workflow

```sh
# 1. Edit or add files under .apm/
# 2. Re-deploy native primitives to every target in apm.yml
apm install

# 3. Re-compile the instruction roll-ups consumed by Gemini and Codex
apm compile -t gemini,codex

# 4. Commit source, deployed files, lockfile, and compiled output together
git add .apm/ .claude/ .github/instructions/ .github/skills/ \
        .gemini/ .cursor/ .opencode/ .agents/ \
        AGENTS.md GEMINI.md packages/frontend/src/AGENTS.md \
        apm.lock.yaml
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

The `verify-apm` job runs two checks and fails the PR if either drifts:

1. `apm audit --ci` — verifies that deployed files (`.claude/`, `.github/`,
   `.gemini/`, …) match the lockfile hashes. Fails if `.apm/` was edited
   without running `apm install`.
2. `apm compile -t gemini,codex` followed by `git status --porcelain --
   AGENTS.md GEMINI.md packages/frontend/src/AGENTS.md` — verifies that the
   committed compiled output matches the current `.apm/` source. Fails if
   you edited `.apm/instructions/` without running `apm compile`.

## Policy

APM supports org-level governance via `apm-policy.yml`, but this is an
enterprise feature for multi-team organizations. This project does not use it.
