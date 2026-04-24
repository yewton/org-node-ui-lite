# CLAUDE.md

## Before opening a pull request

Run the full test suite and confirm all checks pass:

```sh
eldev --packaged --debug --trace --time compile --warnings-as-errors
eldev --debug --trace --time test
npm run lint
npm run check
npm test
```

These mirror the CI jobs defined in `.github/workflows/test.yaml`.

## Language

All deliverables must be written in English: commit messages, pull request titles and descriptions, and any other generated text artifacts.
