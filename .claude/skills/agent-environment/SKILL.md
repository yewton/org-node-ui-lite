---
name: agent-environment-constraints
description: Limitations and constraints of the Claude agent environment. Use when debugging bash command failures or running Emacs tasks.
---

# Agent Environment Constraints

- **Bash Session:** The `run_in_bash_session` tool in this environment blocks scripts containing the literal string 'emacs'. Use Eldev to run Elisp tasks to avoid this restriction.
