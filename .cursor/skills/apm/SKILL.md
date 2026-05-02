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
| `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `packages/frontend/src/{CLAUDE,AGENTS}.md` | Compiled by `apm compile` — do not edit |

## Two commands, two responsibilities

`apm install` and `apm compile` solve different problems and both must run:

- **`apm install`** deploys skills, commands, hooks, and MCP config into
  agent-native directories (`.claude/`, `.github/`, `.gemini/`, …).
  GitHub Copilot, Cursor, and OpenCode read these directly.
- **`apm compile`** rolls `.apm/instructions/` up into a single context file
  per agent. Gemini and Codex *require* this step (`GEMINI.md` / `AGENTS.md`);
  Claude reads `CLAUDE.md` from compile too. We always compile for **all**
  targets so `.apm/` remains the single source of truth and every agent sees
  the same rules.

## Workflow

```sh
# 1. Edit or add files under .apm/

# 2. Re-deploy native primitives (skills, hooks, MCP) to every target in
#    apm.yml. Also (re-)populates `apm_modules/` from external deps.
apm install

# 3. Compile the instruction roll-ups for every supported agent.
#    Always invoke the wrapper, not `apm compile` directly — see
#    "Why the apm-compile wrapper" below. The wrapper is bundled with
#    this skill so `apm install` keeps it deployed alongside the docs.
#    `--stash-list` points at this project's stash list; the path is
#    project-specific and lives outside the skill on purpose.
.apm/skills/apm/scripts/apm-compile.sh --stash-list apm-compile-stash.txt -t all

# 4. Commit source, deployed files, lockfile, and compiled output together
git add .apm/ .claude/ .github/instructions/ .github/skills/ \
        .gemini/ .cursor/ .opencode/ .agents/ \
        CLAUDE.md AGENTS.md GEMINI.md \
        packages/frontend/src/CLAUDE.md packages/frontend/src/AGENTS.md \
        apm.lock.yaml
git commit -m "..."
```

### Why the apm-compile wrapper

APM's Claude formatter auto-injects an
`@apm_modules/<owner>/<package>/CLAUDE.md` import into the project's
compiled `CLAUDE.md` for every populated dependency, regardless of
`compilation.exclude`. For monorepo deps that ship a contributor-facing
`CLAUDE.md` at their root (e.g. `vercel-labs/agent-skills`), that line
pulls upstream "how to author a skill in *that* repo" docs into our
agents' context.

The bundled `scripts/apm-compile.sh` accepts `--stash-list PATH`. PATH
points to a project-specific file with one path per line (relative to
the repo root); each listed file or directory is moved aside before
`apm compile` runs and restored on exit (even on failure, via a
`trap`). Comments (`#`) and blank lines are allowed.

In this project the stash list lives at the repo root in
`apm-compile-stash.txt`. The list is project-specific configuration —
contents differ per consumer of this skill — so it's deliberately
*not* part of the skill bundle. Other projects using this skill
supply their own list (or omit `--stash-list` entirely; the wrapper
then passes through to `apm compile` unchanged).

The canonical script source is `.apm/skills/apm/scripts/apm-compile.sh`.
`apm install` deploys copies into `.claude/skills/apm/scripts/`,
`.gemini/skills/apm/scripts/`, etc. — invoke whichever path your tools
make convenient; all copies use `git rev-parse --show-toplevel` to
resolve repo-root-relative paths from the stash list.

Tracked in issue #47 (with removal criteria). Upstream bug:
microsoft/apm#1047.

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
2. `.apm/skills/apm/scripts/apm-compile.sh --stash-list apm-compile-stash.txt -t all`
   followed by `git status --porcelain` on the compiled files —
   verifies that the committed `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`,
   and the scoped `packages/frontend/src/*` companions match the
   current `.apm/` source. Fails if you edited `.apm/instructions/`
   without re-running the compile wrapper.

## Policy

APM supports org-level governance via `apm-policy.yml`, but this is an
enterprise feature for multi-team organizations. This project does not use it.
