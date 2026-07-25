# Skill Regression Ledger

`skill-regression-ledger` records local, append-only regression evidence for agent skills, prompts, and fixture packs. It gives reviewers one stable place to see what changed, what command was run, and whether the result passed, failed, drifted, or was blocked.

## Quickstart

```bash
npm install
npm run smoke
./bin/skill-regression-ledger.js init ./examples/my-skill
./bin/skill-regression-ledger.js add --ledger ./examples/my-skill \
  --fixture fixtures/basic-fixture.md \
  --command "npm test" \
  --result pass \
  --expected "tests pass" \
  --actual "tests pass"
./bin/skill-regression-ledger.js report --ledger ./examples/my-skill --format markdown
```

## Evidence Model

Each JSONL entry includes:

- fixture path
- verification command
- expected outcome
- actual outcome
- result: `pass`, `fail`, `drift`, or `blocked`
- classification and reviewer notes
- optional evidence file references

Ledgers are stored at `.skill-regression-ledger/ledger.jsonl` under the selected skill or prompt directory.

## CLI

```bash
skill-regression-ledger init <target-dir>
skill-regression-ledger add --ledger <target-dir> --fixture <file> --command "npm test" --result pass --expected "..." --actual "..."
skill-regression-ledger validate --ledger <target-dir>
skill-regression-ledger report --ledger <target-dir> --format markdown
skill-regression-ledger report --ledger <target-dir> --format json
```

## Library API

```js
import { addEntry, reportLedger, validateLedger } from 'skill-regression-ledger';

addEntry('skills/my-skill', {
  fixture: 'fixtures/basic.md',
  command: 'npm test',
  result: 'pass',
  expected: 'expected behavior',
  actual: 'expected behavior',
  classification: 'pass'
});

console.log(reportLedger('skills/my-skill', 'markdown'));
console.log(validateLedger('skills/my-skill'));
```

## CI Usage

Run `npm test`, then record fixture outcomes from your own test harness. Fail the job on `skill-regression-ledger validate --ledger <dir>` when evidence is missing or malformed.

Maintainers can run `npm run package:check` before a release. It inspects the
publish file list, packs the project, imports the library from the tarball, and
executes the packed CLI.

## Privacy and Safety

This package is local-only. It does not upload telemetry, call model APIs, or mutate skill registries. Treat ledger entries as review artifacts and avoid pasting secrets, customer data, or private transcripts into `expected`, `actual`, or `notes` fields.

## Limitations

- No LLM judging or semantic comparison.
- No hosted dashboard.
- No automatic command execution; run verification commands yourself and record outcomes.
- JSONL append order is the source of truth for now.
