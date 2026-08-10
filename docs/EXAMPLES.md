# Examples

## Passing Regression

```bash
skill-regression-ledger init ./examples/my-skill
skill-regression-ledger add --ledger ./examples/my-skill \
  --fixture ../../fixtures/basic-fixture.md \
  --command "npm test" \
  --result pass \
  --expected "draft includes risks" \
  --actual "draft includes risks"
skill-regression-ledger validate --ledger ./examples/my-skill
```

## Drift Requiring Review

```bash
skill-regression-ledger init ./examples/connector-plan
skill-regression-ledger add --ledger ./examples/connector-plan \
  --fixture ../../fixtures/drift-fixture.md \
  --command "npm run smoke" \
  --result drift \
  --expected "approval gate is explicit" \
  --actual "approval gate is implied" \
  --classification drift \
  --notes "Needs maintainer decision before publish"
skill-regression-ledger validate --ledger ./examples/connector-plan
```
