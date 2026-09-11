import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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
  return fs.readFileSync(file, 'utf8').split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim() !== '')
    .map(({ line, lineNumber }) => {
    try {
      return { ...JSON.parse(line), _line: lineNumber };
    } catch (error) {
      return { _line: lineNumber, _error: `Invalid JSON: ${error.message}` };
    }
  });
}

export function normalizeEntry(input = {}) {
  const entry = {
    id: input.id || `run-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomUUID().slice(0, 8)}`,
    recordedAt: input.recordedAt || new Date().toISOString(),
    fixture: input.fixture ?? '',
    command: input.command ?? '',
    result: input.result ?? '',
    expected: input.expected ?? '',
    actual: input.actual ?? '',
    classification: input.classification ?? input.result ?? '',
    notes: input.notes ?? '',
    evidence: input.evidence ?? []
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
  for (const field of ['id', 'recordedAt', 'fixture', 'command', 'result', 'expected', 'actual', 'classification']) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') issues.push(`missing ${field}`);
    else if (typeof entry[field] !== 'string' || entry[field].trim() === '') issues.push(`${field} must be a nonempty string`);
  }
  if (typeof entry.recordedAt === 'string' && entry.recordedAt.trim() && Number.isNaN(Date.parse(entry.recordedAt))) {
    issues.push(`invalid recordedAt ${entry.recordedAt}`);
  }
  if (typeof entry.result === 'string' && entry.result.trim() && !VALID_RESULTS.has(entry.result)) issues.push(`invalid result ${entry.result}`);
  if (entry.notes !== undefined && typeof entry.notes !== 'string') issues.push('notes must be a string');
  if (entry.evidence !== undefined && (!Array.isArray(entry.evidence) || entry.evidence.some((item) => typeof item !== 'string' || item.trim() === ''))) {
    issues.push('evidence must be an array of nonempty strings');
  }
  return issues;
}

function validateFileReference(root, reference, kind) {
  const resolved = path.resolve(root, reference);
  try {
    return fs.statSync(resolved).isFile() ? null : `${kind} is not a regular file: ${reference}`;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return `${kind} not found: ${reference}`;
    return `${kind} cannot be inspected: ${reference}`;
  }
}

export function validateLedger(targetDir = process.cwd()) {
  const { root } = ledgerPaths(targetDir);
  const entries = readEntries(targetDir);
  const issues = [];
  if (entries.length === 0) {
    issues.push({ line: 0, issue: 'ledger contains no evidence entries' });
  }
  const idLines = new Map();
  entries.forEach((entry) => {
    if (entry._error) issues.push({ line: entry._line, issue: entry._error });
    validateEntry(entry).forEach((issue) => issues.push({ line: entry._line, issue }));
    if (typeof entry.fixture === 'string' && entry.fixture.trim()) {
      const issue = validateFileReference(root, entry.fixture, 'fixture');
      if (issue) issues.push({ line: entry._line, issue });
    }
    if (Array.isArray(entry.evidence)) {
      entry.evidence.forEach((reference) => {
        if (typeof reference === 'string' && reference.trim()) {
          const issue = validateFileReference(root, reference, 'evidence');
          if (issue) issues.push({ line: entry._line, issue });
        }
      });
    }
    if (entry.id) {
      if (idLines.has(entry.id)) {
        issues.push({ line: entry._line, issue: `duplicate id ${entry.id} (first seen on line ${idLines.get(entry.id)})` });
      } else {
        idLines.set(entry.id, entry._line);
      }
    }
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
  const { file } = ledgerPaths(targetDir);
  if (!fs.existsSync(file)) {
    throw new Error(`Ledger not found at ${file}. Run \`skill-regression-ledger init ${path.resolve(targetDir)}\` first.`);
  }
  const entries = readEntries(targetDir);
  const summary = summarize(entries);
  if (format === 'json') {
    const publicEntries = [];
    const invalidEntries = [];
    for (const entry of entries) {
      if (entry._error) {
        invalidEntries.push({ line: entry._line, error: entry._error });
        continue;
      }
      const { _line, _error, ...publicEntry } = entry;
      publicEntries.push(publicEntry);
    }
    return JSON.stringify({ summary, entries: publicEntries, invalidEntries }, null, 2);
  }
  const tableCell = (value) => String(value || 'missing')
    .replace(/\r\n?|\n/g, '<br>')
    .replace(/\|/g, '\\|');
  const rows = entries.map((entry) => `| ${tableCell(entry.fixture)} | ${tableCell(entry.result)} | ${tableCell(entry.classification)} | ${tableCell(entry.command)} |`);
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
