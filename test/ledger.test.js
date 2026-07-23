import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { addEntry, initLedger, readEntries, reportLedger, validateLedger } from '../src/index.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-ledger-'));
}

test('initializes a ledger file', () => {
  const dir = tempDir();
  const paths = initLedger(dir);
  assert.equal(fs.existsSync(paths.file), true);
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
