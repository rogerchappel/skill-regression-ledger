import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { run } from '../src/cli.js';

function capture() {
  const lines = [];
  return { io: { log: (value) => lines.push(String(value)), error: (value) => lines.push(String(value)) }, lines };
}

function writeReferences(dir, evidence = []) {
  fs.mkdirSync(path.join(dir, 'fixtures'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'fixtures', 'basic-fixture.md'), 'fixture\n');
  for (const reference of evidence) fs.writeFileSync(path.join(dir, reference), 'evidence\n');
}

test('cli initializes and reports a ledger', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-'));
  const { io, lines } = capture();
  assert.equal(run(['init', dir], io), 0);
  assert.equal(run(['add', '--ledger', dir, '--fixture', 'fixtures/basic-fixture.md', '--command', 'npm test', '--result', 'pass', '--expected', 'ok', '--actual', 'ok'], io), 0);
  assert.equal(run(['report', '--ledger', dir, '--format', 'markdown'], io), 0);
  assert.match(lines.join('\n'), /Skill Regression Ledger Report/);
});

test('cli init accepts the global --ledger target syntax', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-ledger-option-'));
  const { io } = capture();
  assert.equal(run(['init', '--ledger', dir], io), 0);
  assert.equal(fs.existsSync(path.join(dir, '.skill-regression-ledger', 'ledger.jsonl')), true);
});

test('cli report fails with an actionable error when the ledger is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-missing-'));
  const { io, lines } = capture();
  assert.equal(run(['report', '--ledger', dir], io), 1);
  assert.match(lines.join('\n'), /Ledger not found at .*ledger\.jsonl/);
  assert.match(lines.join('\n'), /skill-regression-ledger init/);
});

test('cli rejects malformed options before appending evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-options-'));
  const { io, lines } = capture();
  run(['init', dir], io);
  const file = path.join(dir, '.skill-regression-ledger', 'ledger.jsonl');
  const valid = ['add', '--ledger', dir, '--fixture', 'fixtures/basic-fixture.md', '--command', 'npm test', '--result', 'pass', '--expected', 'ok', '--actual', 'ok'];

  for (const argv of [
    ['add', '--ledger', dir, '--fixture'],
    [...valid, '--unknown', 'value'],
    ['report', '--ledger', dir, '--format', 'yaml'],
    [...valid.slice(0, -1), '']
  ]) {
    assert.equal(run(argv, io), 1);
    assert.equal(fs.readFileSync(file, 'utf8'), '');
  }
  assert.match(lines.join('\n'), /Usage:/);
});

test('cli valid add, report, and validate flow remains supported', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-valid-'));
  const { io, lines } = capture();
  writeReferences(dir, ['test.log', 'report.json']);

  assert.equal(run(['init', dir], io), 0);
  assert.equal(run(['add', '--ledger', dir, '--fixture', 'fixtures/basic-fixture.md', '--command', 'npm test', '--result', 'pass', '--expected', 'ok', '--actual', 'ok', '--evidence', 'test.log,report.json'], io), 0);
  assert.equal(run(['report', '--ledger', dir, '--format', 'json'], io), 0);
  assert.equal(run(['validate', '--ledger', dir], io), 0);
  assert.match(lines.join('\n'), /"evidence": \[/);
});

test('cli validate returns non-zero with line-specific missing references', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-references-'));
  const { io, lines } = capture();
  run(['init', dir], io);
  run(['add', '--ledger', dir, '--fixture', 'fixtures/missing.md', '--command', 'npm test', '--result', 'pass', '--expected', 'ok', '--actual', 'ok', '--evidence', 'missing.log'], io);

  assert.equal(run(['validate', '--ledger', dir], io), 2);
  assert.match(lines.join('\n'), /"line": 1/);
  assert.match(lines.join('\n'), /fixture not found: fixtures\/missing\.md/);
  assert.match(lines.join('\n'), /evidence not found: missing\.log/);
});

test('cli validate reports physical lines when blank lines are present', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-lines-'));
  const { io, lines } = capture();
  run(['init', dir], io);
  const file = path.join(dir, '.skill-regression-ledger', 'ledger.jsonl');
  const entry = {
    id: 'run-cli-lines',
    recordedAt: '2026-08-13T11:00:00.000Z',
    fixture: 'fixtures/missing.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass'
  };
  fs.writeFileSync(file, `\n${JSON.stringify(entry)}\n\n{malformed\n`, 'utf8');

  assert.equal(run(['validate', '--ledger', dir], io), 2);
  const output = lines.join('\n');
  assert.match(output, /"line": 2/);
  assert.match(output, /fixture not found: fixtures\/missing\.md/);
  assert.match(output, /"line": 4/);
  assert.match(output, /Invalid JSON/);
});

test('cli validate returns non-zero for invalid ledger', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-invalid-'));
  const { io } = capture();
  run(['init', dir], io);
  fs.appendFileSync(path.join(dir, '.skill-regression-ledger', 'ledger.jsonl'), '{"result":"oops"}\n');
  assert.equal(run(['validate', '--ledger', dir], io), 2);
});

test('cli validate reports directory references with their ledger line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-directory-'));
  const { io, lines } = capture();
  run(['init', dir], io);
  fs.mkdirSync(path.join(dir, 'fixture-dir'));
  fs.mkdirSync(path.join(dir, 'evidence-dir'));
  fs.appendFileSync(path.join(dir, '.skill-regression-ledger', 'ledger.jsonl'), `${JSON.stringify({
    id: 'directory-references', recordedAt: new Date().toISOString(), fixture: 'fixture-dir',
    command: 'npm test', result: 'pass', expected: 'ok', actual: 'ok', classification: 'pass', evidence: ['evidence-dir']
  })}\n`);
  assert.equal(run(['validate', '--ledger', dir], io), 2);
  const output = lines.join('\n');
  assert.match(output, /"line": 1[\s\S]*"issue": "fixture is not a regular file: fixture-dir"/);
  assert.match(output, /"line": 1[\s\S]*"issue": "evidence is not a regular file: evidence-dir"/);
});

test('cli validate returns non-zero when an initialized ledger has no evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-empty-'));
  const { io, lines } = capture();
  run(['init', dir], io);

  assert.equal(run(['validate', '--ledger', dir], io), 2);
  assert.match(lines.join('\n'), /ledger contains no evidence entries/);
});

test('cli validate rejects manually supplied entries without metadata', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-metadata-'));
  const { io, lines } = capture();
  run(['init', dir], io);
  const entry = {
    fixture: 'fixtures/basic-fixture.md',
    command: 'npm test',
    result: 'pass',
    expected: 'ok',
    actual: 'ok',
    classification: 'pass'
  };
  fs.appendFileSync(path.join(dir, '.skill-regression-ledger', 'ledger.jsonl'), `${JSON.stringify(entry)}\n`);

  assert.equal(run(['validate', '--ledger', dir], io), 2);
  assert.match(lines.join('\n'), /missing id/);
  assert.match(lines.join('\n'), /missing recordedAt/);
});
