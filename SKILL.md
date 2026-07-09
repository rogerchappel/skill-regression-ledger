# Skill Regression Ledger

Use this skill when an agent changes a reusable prompt, `SKILL.md`, workflow, or fixture pack and needs local evidence that expected behavior still holds.

## Inputs

- A skill or prompt directory.
- One or more fixtures that describe expected behavior.
- Verification commands and observed outcomes.
- Reviewer notes when a result is not an obvious pass.

## Side-Effect Boundaries

This skill writes only to `.skill-regression-ledger/ledger.jsonl` under the selected ledger directory. It does not call model APIs, upload telemetry, apply skill proposals, or mutate live skill registries.

## Approval Requirements

No approval is needed for local ledger writes. Ask for approval before running any fixture command that touches external systems, credentials, production repos, or paid services.

## Workflow

1. Initialize the ledger with `skill-regression-ledger init <dir>`.
2. Run the fixture command separately.
3. Record the observed result with `skill-regression-ledger add --ledger <dir> --fixture <file> --command "<cmd>" --result pass|fail|drift`.
4. Run `skill-regression-ledger validate --ledger <dir>`.
5. Share `skill-regression-ledger report --ledger <dir> --format markdown` in the review handoff.

## Validation

A valid entry has a fixture path, command, result, expected outcome, actual outcome, and classification. Mark entries as `drift` when behavior changed but the reviewer has not decided whether it is acceptable.
