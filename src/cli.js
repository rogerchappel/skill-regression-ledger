import { addEntry, initLedger, reportLedger, validateLedger } from './index.js';

const USAGE = 'Usage: skill-regression-ledger <init|add|report|validate> [target] [--ledger dir]';
const OPTIONS = {
  init: new Set(),
  add: new Set(['ledger', 'fixture', 'command', 'result', 'expected', 'actual', 'classification', 'notes', 'evidence']),
  report: new Set(['ledger', 'format']),
  validate: new Set(['ledger'])
};

function parseArgs(argv, allowedOptions) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    if (!allowedOptions.has(key)) throw new Error(`Unknown option: --${key}`);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`Missing value for --${key}`);
    args[key] = next;
    i += 1;
  }
  return args;
}

export function run(argv = process.argv.slice(2), io = console) {
  if (argv.length === 0 || argv.includes('--help')) {
    io.log(USAGE);
    return 0;
  }

  const command = argv[0];
  if (!Object.hasOwn(OPTIONS, command)) {
    io.error(`Unknown command: ${command}`);
    io.error(USAGE);
    return 1;
  }

  let args;
  try {
    args = parseArgs(argv.slice(1), OPTIONS[command]);
  } catch (error) {
    io.error(error.message);
    io.error(USAGE);
    return 1;
  }
  const [target, ...extraTargets] = args._;
  if (extraTargets.length > 0) {
    io.error(`Unexpected argument: ${extraTargets[0]}`);
    io.error(USAGE);
    return 1;
  }
  const ledger = args.ledger || target || process.cwd();

  if (command === 'init') {
    const paths = initLedger(target || process.cwd());
    io.log(`Initialized ledger: ${paths.file}`);
    return 0;
  }

  if (command === 'add') {
    let entry;
    try {
      entry = addEntry(ledger, {
        fixture: args.fixture,
        command: args.command,
        result: args.result,
        expected: args.expected,
        actual: args.actual,
        classification: args.classification,
        notes: args.notes,
        evidence: args.evidence === undefined ? [] : args.evidence.split(',')
      });
    } catch (error) {
      io.error(error.message);
      io.error(USAGE);
      return 1;
    }
    io.log(JSON.stringify(entry, null, 2));
    return 0;
  }

  if (command === 'report') {
    if (args.format && !['markdown', 'json'].includes(args.format)) {
      io.error(`Unsupported report format: ${args.format}`);
      io.error(USAGE);
      return 1;
    }
    io.log(reportLedger(ledger, args.format || 'markdown'));
    return 0;
  }

  if (command === 'validate') {
    const result = validateLedger(ledger);
    io.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 2;
  }
}
