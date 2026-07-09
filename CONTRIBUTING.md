# Contributing

Keep changes local-first and deterministic. New behavior should include fixture-backed tests, README or SKILL.md updates when user-facing behavior changes, and a smoke path that does not require network access.

Before opening a PR, run:

```bash
npm test
npm run check
npm run build
npm run smoke
```
