import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// Run build before all tests so dist/ is fresh
const fixtureDir = mkdtempSync(join(tmpdir(), 'skill-regression-dist-test-'));
rmSync(fixtureDir, { recursive: true }); // clean after

test('build produces a self-executable CLI', () => {
  const cliBin = join(process.cwd(), 'dist', 'src-cli.js');
  assert.ok(existsSync(cliBin), 'dist/src-cli.js should exist after build');
  const output = execSync(`node ${cliBin} --help`, { encoding: 'utf8' });
  assert.match(output, /Usage:/);
});

test('built CLI resolves relative imports without ERR_MODULE_NOT_FOUND', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-reg-dist-init-'));
  try {
    execSync(`node dist/src-cli.js init "${dir}"`, { encoding: 'utf8' });
    assert.ok(existsSync(join(dir, '.skill-regression-ledger', 'ledger.jsonl')),
      'Ledger file should be created');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('built CLI handles multiple commands end-to-end', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-reg-e2e-'));
  try {
    execSync(`node dist/src-cli.js init "${dir}"`, { encoding: 'utf8' });
    const addOut = execSync(
      `node dist/src-cli.js add --ledger "${dir}" --fixture test --command echo --result pass --expected ok --actual ok`,
      { encoding: 'utf8' }
    );
    const parsed = JSON.parse(addOut);
    assert.equal(parsed.result, 'pass');
    assert.equal(parsed.fixture, 'test');

    const reportOut = execSync(
      `node dist/src-cli.js report --ledger "${dir}" --format markdown`,
      { encoding: 'utf8' }
    );
    assert.match(reportOut, /Skill Regression Ledger Report/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
