# Ledger Format

A ledger is newline-delimited JSON at `.skill-regression-ledger/ledger.jsonl`.

Required fields:

- `id`
- `recordedAt`
- `fixture`
- `command`
- `result`
- `expected`
- `actual`
- `classification`

Optional fields:

- `notes`
- `evidence`

Valid `result` values are `pass`, `fail`, `drift`, and `blocked`.
