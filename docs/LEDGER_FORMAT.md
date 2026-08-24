# Ledger Format

A ledger is newline-delimited JSON at `.skill-regression-ledger/ledger.jsonl`.
Empty and whitespace-only lines are permitted and ignored. They retain their
physical positions, so validation diagnostics always use the line numbers that
tools such as `nl -ba` display.

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

`fixture` and each string in the optional `evidence` array are filesystem
references. Relative references are resolved from the selected ledger target
directory (the directory that contains `.skill-regression-ledger`), not from
the current working directory or the ledger file's directory. Absolute paths
remain absolute. Every reference must resolve to a regular file. Validation
fails when a path is missing, is a directory, or is another non-regular target,
and reports each invalid fixture or evidence reference against its physical
JSONL line.

Valid `result` values are `pass`, `fail`, `drift`, and `blocked`.

The ledger must contain at least one entry; an initialized empty ledger fails
validation because it contains no regression evidence.

`id` must be non-empty and unique within the ledger. Duplicate IDs fail
validation on each duplicate line and identify the first line where the ID
appeared. `recordedAt` must be a non-empty timestamp accepted by
JavaScript's `Date.parse`. Entries written by `addEntry` or the `add` command
generate both values automatically. Generated IDs combine a millisecond
timestamp with a random suffix so rapid additions remain unique. Manually
written and legacy JSONL entries that omit either value fail validation.

Markdown reports escape pipes as `\|` and render line breaks as `<br>` inside
table cells, keeping each ledger entry on one table row. JSON reports retain the
original field values.
