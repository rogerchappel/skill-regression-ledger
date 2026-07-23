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

`id` must be non-empty. `recordedAt` must be a non-empty timestamp accepted by
JavaScript's `Date.parse`. Entries written by `addEntry` or the `add` command
generate both values automatically. Manually written and legacy JSONL entries
that omit either value fail validation.

Markdown reports escape pipes as `\|` and render line breaks as `<br>` inside
table cells, keeping each ledger entry on one table row. JSON reports retain the
original field values.
