import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-package-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    ...options
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }
  return result.stdout;
}

try {
  const dryRun = JSON.parse(run('npm', ['pack', '--dry-run', '--json']));
  const files = dryRun[0].files.map(({ path: file }) => file);
  for (const required of [
    'LICENSE',
    'README.md',
    'SKILL.md',
    'bin/skill-regression-ledger.js',
    'package.json',
    'src/cli.js',
    'src/index.js'
  ]) {
    assert(files.includes(required), `packed artifact is missing ${required}`);
  }
  for (const excluded of ['.github/', 'fixtures/', 'scripts/', 'test/']) {
    assert(
      files.every((file) => !file.startsWith(excluded)),
      `packed artifact unexpectedly includes ${excluded}`
    );
  }

  const pack = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temp]));
  const tarball = path.join(temp, pack[0].filename);
  run('tar', ['-xzf', tarball, '-C', temp]);

  const packageRoot = path.join(temp, 'package');
  const library = await import(pathToFileURL(path.join(packageRoot, 'src/index.js')));
  assert.equal(typeof library.initLedger, 'function');

  const ledger = path.join(temp, 'cli-ledger');
  run(process.execPath, [
    path.join(packageRoot, 'bin/skill-regression-ledger.js'),
    'init',
    ledger
  ]);
  assert(fs.existsSync(path.join(ledger, '.skill-regression-ledger', 'ledger.jsonl')));

  console.log(`package smoke ok (${files.length} files)`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
