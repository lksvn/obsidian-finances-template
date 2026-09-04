# Recurrence rules

Use **QuickAdd: New financial recurrence**. Alternatively, copy [`FINANCES/TEMPLATES/Recurrence.md`](../vault/FINANCES/TEMPLATES/Recurrence.md) and edit it manually.

## Essential properties

- `status: active`
- `frequency: monthly` or `yearly`
- `generate_transaction: true`
- `amount_type: fixed` or `variable`
- `expected_amount`: fixed amount or initial fallback
- `due_day`
- `person`, `category`, and `start`
- `payment_method` is optional

## Charges included in a card bill

Use:

```yaml
accounting: included_in_bill
generate_transaction: false
```

This documents the subscription without duplicating an amount already included in the card bill.

## Installments

Add `installments_total`. The generator calculates the current installment from `start` and stops after the final period.
