# Data model

## Transaction

Each transaction is a note stored under `FINANCES/TRANSACTIONS/YYYY/MM`.

| Property | Required | Purpose |
|---|---:|---|
| `person` | yes | Link to a note in `PEOPLE` |
| `movement` | yes | `pay` or `receive` |
| `period` | yes | Month in `YYYY-MM` format |
| `period_note` | yes | Link to the monthly period note |
| `description` | yes | Name displayed in Bases |
| `amount` | yes | Number without a currency symbol |
| `status` | yes | `pending`, `completed`, or `cancelled` |
| `category` | yes | One or more category links |
| `due_date` | no | Date in `YYYY-MM-DD` format |
| `counterparty` | no | Related person or organization |
| `installment` | no | Current installment number |
| `installments_total` | no | Total installment count |
| `recurrence` | no | Link to the rule that generated the note |
| `data_origin` | no | For example, `estimated` or `generated` |
| `provisional_amount` | no | `true` for variable estimates |

## Hub notes

- `PEOPLE`: people responsible for transactions.
- `CATEGORIES`: financial classification.
- `PERIODS`: monthly nodes for backlinks and Graph view.
- `RECURRENCES`: rules used by the monthly generator.

Bases calculate presentation and totals directly from properties. Do not store calculated balances or totals in transaction notes.
