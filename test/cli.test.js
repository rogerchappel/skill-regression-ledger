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

test('cli validate returns non-zero for invalid ledger', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-cli-invalid-'));
  const { io } = capture();
  run(['init', dir], io);
  fs.appendFileSync(path.join(dir, '.skill-regression-ledger', 'ledger.jsonl'), '{"result":"oops"}\n');
  assert.equal(run(['validate', '--ledger', dir], io), 2);
});
