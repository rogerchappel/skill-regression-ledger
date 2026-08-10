import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { addEntry, initLedger, readEntries, reportLedger, validateEntry, validateLedger } from '../src/index.js';

function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-ledger-'));
  fs.mkdirSync(path.join(dir, 'fixtures'));
  for (const fixture of ['basic-fixture.md', 'drift-fixture.md']) {
    fs.writeFileSync(path.join(dir, 'fixtures', fixture), 'fixture\n');
  }
  return dir;
}

test('initializes a ledger file', () => {
  const dir = tempDir();
  const paths = initLedger(dir);
  assert.equal(fs.existsSync(paths.file), true);
});

test('validation rejects an initialized ledger without evidence', () => {
  const dir = tempDir();
  initLedger(dir);

  assert.deepEqual(validateLedger(dir), {
    ok: false,
    entries: 0,
    issues: [{ line: 0, issue: 'ledger contains no evidence entries' }]
  });
});

test('adds and reads a fixture-backed entry', () => {
  const dir = tempDir();
  addEntry(dir, {
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'checklist appears',
    actual: 'checklist appears',
    classification: 'pass'
  });
  const entries = readEntries(dir);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].result, 'pass');
});

test('automatic ids remain unique for rapid additions', () => {
  const dir = tempDir();
  const input = {
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass'
  };

  const first = addEntry(dir, input);
  const second = addEntry(dir, input);

  assert.notEqual(first.id, second.id);
  assert.equal(validateLedger(dir).ok, true);
});

test('reports markdown summaries', () => {
  const dir = tempDir();
  addEntry(dir, {
    fixture: 'fixtures/drift-fixture.md',
    command: 'npm run smoke',
    result: 'drift',
    expected: 'approval section remains',
    actual: 'approval section renamed',
    classification: 'drift'
  });
  const report = reportLedger(dir, 'markdown');
  assert.match(report, /Drift: 1/);
  assert.match(report, /fixtures\/drift-fixture.md/);
});

test('validation fails for missing evidence fields', () => {
  const dir = tempDir();
  initLedger(dir);
  fs.appendFileSync(path.join(dir, '.skill-regression-ledger', 'ledger.jsonl'), `${JSON.stringify({ result: 'pass' })}\n`);
  const result = validateLedger(dir);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.issue === 'missing fixture'), true);
});

test('validation reports a missing fixture on its ledger line', () => {
  const dir = tempDir();
  const entry = addEntry(dir, {
    fixture: 'fixtures/missing.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass'
  });

  assert.deepEqual(validateLedger(dir), {
    ok: false,
    entries: 1,
    issues: [{ line: 1, issue: `fixture not found: ${entry.fixture}` }]
  });
});

test('validation checks every optional evidence path', () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, 'results'));
  fs.writeFileSync(path.join(dir, 'results', 'test.log'), 'passed\n');
  addEntry(dir, {
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass',
    evidence: ['results/test.log', 'results/missing.json']
  });

  assert.deepEqual(validateLedger(dir).issues, [
    { line: 1, issue: 'evidence not found: results/missing.json' }
  ]);
});

test('validation accepts existing fixture and multiple evidence paths relative to the target', () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, 'results'));
  fs.writeFileSync(path.join(dir, 'results', 'test.log'), 'passed\n');
  fs.writeFileSync(path.join(dir, 'results', 'report.json'), '{}\n');
  addEntry(dir, {
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass',
    evidence: ['results/test.log', 'results/report.json']
  });

  assert.deepEqual(validateLedger(dir), { ok: true, entries: 1, issues: [] });
});

test('library validation rejects non-string fields and malformed evidence', () => {
  const base = {
    id: 'run-manual',
    recordedAt: '2026-08-02T00:00:00.000Z',
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass',
    notes: '',
    evidence: []
  };

  assert.deepEqual(validateEntry({ ...base, fixture: true }), ['fixture must be a nonempty string']);
  assert.deepEqual(validateEntry({ ...base, evidence: 'test.log' }), ['evidence must be an array of nonempty strings']);
  assert.deepEqual(validateEntry({ ...base, evidence: ['test.log', '  '] }), ['evidence must be an array of nonempty strings']);
  assert.deepEqual(validateEntry({ ...base, notes: false }), ['notes must be a string']);
});

test('add rejects malformed input without appending to an existing ledger', () => {
  const dir = tempDir();
  const { file } = initLedger(dir);

  assert.throws(() => addEntry(dir, {
    fixture: true,
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok'
  }), /fixture must be a nonempty string/);
  assert.equal(fs.readFileSync(file, 'utf8'), '');
});

test('validation rejects missing and unusable required metadata', () => {
  const dir = tempDir();
  initLedger(dir);
  const file = path.join(dir, '.skill-regression-ledger', 'ledger.jsonl');
  const evidence = {
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass'
  };
  fs.appendFileSync(file, `${JSON.stringify(evidence)}\n`);
  fs.appendFileSync(file, `${JSON.stringify({ ...evidence, id: 'run-1', recordedAt: 'not-a-date' })}\n`);

  const result = validateLedger(dir);

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, [
    { line: 1, issue: 'missing id' },
    { line: 1, issue: 'missing recordedAt' },
    { line: 2, issue: 'invalid recordedAt not-a-date' }
  ]);
});

test('validation reports duplicate manual ids on the duplicate line', () => {
  const dir = tempDir();
  initLedger(dir);
  const file = path.join(dir, '.skill-regression-ledger', 'ledger.jsonl');
  const entry = {
    id: 'run-manual',
    recordedAt: '2026-07-31T16:00:00.000Z',
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass'
  };
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n${JSON.stringify(entry)}\n`);

  assert.deepEqual(validateLedger(dir).issues, [
    { line: 2, issue: 'duplicate id run-manual (first seen on line 1)' }
  ]);
});

test('markdown reports keep special-character fields in one table row', () => {
  const dir = tempDir();
  addEntry(dir, {
    fixture: 'fixtures/a|b.md',
    command: 'node first.js\nnode second.js',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass|review'
  });

  const report = reportLedger(dir, 'markdown');
  const tableRows = report.split('\n').filter((line) => line.startsWith('| '));

  assert.equal(tableRows.length, 3);
  assert.equal(tableRows[2], '| fixtures/a\\|b.md | pass | pass\\|review | node first.js<br>node second.js |');
});

test('json reports preserve special-character field values', () => {
  const dir = tempDir();
  addEntry(dir, {
    fixture: 'fixtures/a|b.md',
    command: 'node first.js\nnode second.js',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass|review'
  });

  const parsed = JSON.parse(reportLedger(dir, 'json'));

  assert.equal(parsed.entries[0].fixture, 'fixtures/a|b.md');
  assert.equal(parsed.entries[0].command, 'node first.js\nnode second.js');
  assert.equal(parsed.entries[0].classification, 'pass|review');
});

test('reports json summaries', () => {
  const dir = tempDir();
  addEntry(dir, {
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'blocked',
    expected: 'network-free smoke',
    actual: 'external dependency unavailable',
    classification: 'blocked'
  });
  const parsed = JSON.parse(reportLedger(dir, 'json'));
  assert.equal(parsed.summary.blocked, 1);
});
