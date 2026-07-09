import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addEntry, initLedger, reportLedger, validateLedger } from '../src/index.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-regression-smoke-'));
initLedger(dir);
addEntry(dir, {
  fixture: 'fixtures/basic-fixture.md',
  command: 'npm test',
  result: 'pass',
  expected: 'tests pass',
  actual: 'tests pass',
  classification: 'pass'
});
const validation = validateLedger(dir);
if (!validation.ok) throw new Error(JSON.stringify(validation.issues));
console.log(reportLedger(dir, 'markdown'));
