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
