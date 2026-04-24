# CLAUDE.md

## Git workflow

When the goal is to open a pull request, **create a feature branch before making any commits**.
Never commit directly to the default branch (main/master) when a PR is intended — GitHub cannot create a PR from a branch to itself.

Correct order:
1. `git checkout -b <branch-name>`
2. Make changes and commit
3. `git push origin <branch-name>`
4. `gh pr create ...`
