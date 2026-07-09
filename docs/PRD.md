# Skill Regression Ledger PRD

Status: in-progress

## Summary

A local CLI and reusable agent skill for recording prompt or skill regression checks as append-only JSONL ledgers with fixture snapshots, verification commands, and reviewer notes.

## Source Attribution

Created during the 2026-07-08 agent-skills factory lane to replenish the ready queue. The idea extends recurring prompt-regression, skill packaging, and agent-run audit needs without depending on hosted telemetry.

## Target Users

- Skill authors validating reusable agent instructions over time.
- Maintainers reviewing whether a prompt or `SKILL.md` change preserved expected behavior.
- Agent teams that need local evidence before publishing or applying a skill update.

## Problem

Agent skills and prompts change quickly, but regression evidence is often scattered across chat logs, screenshots, and ad hoc notes. Teams need a small local ledger that records fixtures, expected outcomes, verification commands, and reviewer decisions.

## Goals

- Initialize a ledger for a skill or prompt directory.
- Add fixture runs with command, input, expected outcome, actual outcome, and classification.
- Summarize pass/fail/drift trends as Markdown or JSON.
- Validate ledger entries for missing evidence, stale fixtures, and unsafe claims.
- Include a `SKILL.md` that tells agents when and how to record regression evidence.

## Non-Goals

- LLM judging.
- Uploading logs or telemetry.
- Mutating live skills or applying proposals.

## V1 CLI

```bash
skill-regression-ledger init skills/my-skill
skill-regression-ledger add --fixture fixtures/basic.md --command "npm test" --result pass
skill-regression-ledger report --format markdown
```

## Acceptance Criteria

- `npm test`, `npm run check`, `npm run build`, and `npm run smoke` pass.
- Fixture-backed tests cover init, add, report, and validation failures.
- README explains quickstart, evidence model, privacy boundaries, limitations, and CI usage.
- Public repo `rogerchappel/skill-regression-ledger` exists with a release-candidate PR.
