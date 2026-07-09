# Orchestration

`skill-regression-ledger` is designed for local agent runs and CI jobs. Agents should run it after editing a prompt, skill, or fixture set, then attach the generated Markdown report to their review notes.

Recommended workflow:

1. Run `skill-regression-ledger init <skill-dir>` once per skill.
2. Execute the relevant fixture or smoke command.
3. Record the result with `skill-regression-ledger add --ledger <skill-dir> ...`.
4. Run `skill-regression-ledger validate --ledger <skill-dir>` before asking for review.
5. Generate a Markdown report for the PR or handoff.

The CLI never mutates live skills except for the explicit `.skill-regression-ledger/ledger.jsonl` evidence file in the target directory.
