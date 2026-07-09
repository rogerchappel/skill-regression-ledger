import { addEntry, initLedger, reportLedger, validateLedger } from './index.js';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export function run(argv = process.argv.slice(2), io = console) {
  const args = parseArgs(argv);
  const [command, target] = args._;
  const ledger = args.ledger || target || process.cwd();

  if (!command || args.help) {
    io.log('Usage: skill-regression-ledger <init|add|report|validate> [target] [--ledger dir]');
    return 0;
  }

  if (command === 'init') {
    const paths = initLedger(target || process.cwd());
    io.log(`Initialized ledger: ${paths.file}`);
    return 0;
  }

  if (command === 'add') {
    const entry = addEntry(ledger, {
      fixture: args.fixture,
      command: args.command,
      result: args.result,
      expected: args.expected,
      actual: args.actual,
      classification: args.classification,
      notes: args.notes,
      evidence: args.evidence ? String(args.evidence).split(',') : []
    });
    io.log(JSON.stringify(entry, null, 2));
    return 0;
  }

  if (command === 'report') {
    io.log(reportLedger(ledger, args.format || 'markdown'));
    return 0;
  }

  if (command === 'validate') {
    const result = validateLedger(ledger);
    io.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 2;
  }

  io.error(`Unknown command: ${command}`);
  return 1;
}
