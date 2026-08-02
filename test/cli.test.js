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

test('cli initializes and reports a ledger', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-'));
  const { io, lines } = capture();
  assert.equal(run(['init', dir], io), 0);
  assert.equal(run(['add', '--ledger', dir, '--fixture', 'fixtures/basic-fixture.md', '--command', 'npm test', '--result', 'pass', '--expected', 'ok', '--actual', 'ok'], io), 0);
  assert.equal(run(['report', '--ledger', dir, '--format', 'markdown'], io), 0);
  assert.match(lines.join('\n'), /Skill Regression Ledger Report/);
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

  assert.equal(run(['init', dir], io), 0);
  assert.equal(run(['add', '--ledger', dir, '--fixture', 'fixtures/basic-fixture.md', '--command', 'npm test', '--result', 'pass', '--expected', 'ok', '--actual', 'ok', '--evidence', 'test.log,report.json'], io), 0);
  assert.equal(run(['report', '--ledger', dir, '--format', 'json'], io), 0);
  assert.equal(run(['validate', '--ledger', dir], io), 0);
  assert.match(lines.join('\n'), /"evidence": \[/);
});

test('cli validate returns non-zero for invalid ledger', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-invalid-'));
  const { io } = capture();
  run(['init', dir], io);
  fs.appendFileSync(path.join(dir, '.skill-regression-ledger', 'ledger.jsonl'), '{"result":"oops"}\n');
  assert.equal(run(['validate', '--ledger', dir], io), 2);
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
