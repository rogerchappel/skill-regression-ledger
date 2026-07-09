import fs from 'node:fs';
import path from 'node:path';

export const LEDGER_DIR = '.skill-regression-ledger';
export const LEDGER_FILE = 'ledger.jsonl';
const VALID_RESULTS = new Set(['pass', 'fail', 'drift', 'blocked']);

export function ledgerPaths(targetDir = process.cwd()) {
  const root = path.resolve(targetDir);
  const dir = path.join(root, LEDGER_DIR);
  return { root, dir, file: path.join(dir, LEDGER_FILE) };
}

export function initLedger(targetDir = process.cwd()) {
  const paths = ledgerPaths(targetDir);
  fs.mkdirSync(paths.dir, { recursive: true });
  if (!fs.existsSync(paths.file)) fs.writeFileSync(paths.file, '', 'utf8');
  return paths;
}

export function readEntries(targetDir = process.cwd()) {
  const { file } = ledgerPaths(targetDir);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line, index) => {
    try {
      return { ...JSON.parse(line), _line: index + 1 };
    } catch (error) {
      return { _line: index + 1, _error: `Invalid JSON: ${error.message}` };
    }
  });
}

export function normalizeEntry(input = {}) {
  const entry = {
    id: input.id || `run-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    recordedAt: input.recordedAt || new Date().toISOString(),
    fixture: input.fixture || '',
    command: input.command || '',
    result: input.result || '',
    expected: input.expected || '',
    actual: input.actual || '',
    classification: input.classification || input.result || '',
    notes: input.notes || '',
    evidence: input.evidence || []
  };
  return entry;
}

export function addEntry(targetDir, input) {
  const paths = initLedger(targetDir);
  const entry = normalizeEntry(input);
  const issues = validateEntry(entry);
  if (issues.length) {
    const error = new Error(`Invalid ledger entry: ${issues.join('; ')}`);
    error.issues = issues;
    throw error;
  }
  fs.appendFileSync(paths.file, `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

export function validateEntry(entry) {
  const issues = [];
  for (const field of ['fixture', 'command', 'result', 'expected', 'actual', 'classification']) {
    if (!entry[field] || String(entry[field]).trim() === '') issues.push(`missing ${field}`);
  }
  if (entry.result && !VALID_RESULTS.has(entry.result)) issues.push(`invalid result ${entry.result}`);
  return issues;
}

export function validateLedger(targetDir = process.cwd()) {
  const entries = readEntries(targetDir);
  const issues = [];
  entries.forEach((entry) => {
    if (entry._error) issues.push({ line: entry._line, issue: entry._error });
    validateEntry(entry).forEach((issue) => issues.push({ line: entry._line, issue }));
  });
  return { ok: issues.length === 0, entries: entries.length, issues };
}

export function summarize(entries) {
  const summary = { total: entries.length, pass: 0, fail: 0, drift: 0, blocked: 0, invalid: 0 };
  for (const entry of entries) {
    if (entry._error || validateEntry(entry).length) summary.invalid += 1;
    if (Object.hasOwn(summary, entry.result)) summary[entry.result] += 1;
  }
  return summary;
}

export function reportLedger(targetDir = process.cwd(), format = 'markdown') {
  const entries = readEntries(targetDir);
  const summary = summarize(entries);
  if (format === 'json') return JSON.stringify({ summary, entries }, null, 2);
  const rows = entries.map((entry) => `| ${entry.fixture || 'missing'} | ${entry.result || 'missing'} | ${entry.classification || 'missing'} | ${entry.command || 'missing'} |`);
  return [
    '# Skill Regression Ledger Report',
    '',
    `Total: ${summary.total}`,
    `Pass: ${summary.pass}  Fail: ${summary.fail}  Drift: ${summary.drift}  Blocked: ${summary.blocked}  Invalid: ${summary.invalid}`,
    '',
    '| Fixture | Result | Classification | Command |',
    '| --- | --- | --- | --- |',
    ...rows
  ].join('\n');
}
