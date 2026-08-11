import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const cli = path.resolve('bin/skill-regression-ledger.js');

function run(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
}

test('README quickstart records and validates the repository fixture', (t) => {
  const checkout = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-readme-'));
  t.after(() => fs.rmSync(checkout, { recursive: true, force: true }));

  fs.mkdirSync(path.join(checkout, 'fixtures'), { recursive: true });
  fs.copyFileSync('fixtures/basic-fixture.md', path.join(checkout, 'fixtures/basic-fixture.md'));

  const ledger = './examples/my-skill';
  const fixture = '../../fixtures/basic-fixture.md';
  assert.equal(run(checkout, ['init', ledger]).status, 0);
  assert.equal(run(checkout, [
    'add', '--ledger', ledger,
    '--fixture', fixture,
    '--command', 'npm test',
    '--result', 'pass',
    '--expected', 'tests pass',
    '--actual', 'tests pass'
  ]).status, 0);

  const validation = run(checkout, ['validate', '--ledger', ledger]);
  assert.equal(validation.status, 0, validation.stderr);
  assert.deepEqual(JSON.parse(validation.stdout), { ok: true, entries: 1, issues: [] });

  const report = run(checkout, ['report', '--ledger', ledger, '--format', 'markdown']);
  assert.equal(report.status, 0, report.stderr);
  assert.match(report.stdout, /\.\.\/\.\.\/fixtures\/basic-fixture\.md/);

  const readme = fs.readFileSync('README.md', 'utf8');
  assert.match(readme, /--fixture \.\.\/\.\.\/fixtures\/basic-fixture\.md/);
  assert.match(readme, /validate --ledger \.\/examples\/my-skill/);
});
