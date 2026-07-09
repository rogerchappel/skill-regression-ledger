# Examples

## Passing Regression

```bash
skill-regression-ledger add --ledger skills/release-note-weaver \
  --fixture fixtures/basic.md \
  --command "npm test" \
  --result pass \
  --expected "draft includes risks" \
  --actual "draft includes risks"
```

## Drift Requiring Review

```bash
skill-regression-ledger add --ledger skills/connector-plan \
  --fixture fixtures/approval.md \
  --command "npm run smoke" \
  --result drift \
  --expected "approval gate is explicit" \
  --actual "approval gate is implied" \
  --classification drift \
  --notes "Needs maintainer decision before publish"
```
