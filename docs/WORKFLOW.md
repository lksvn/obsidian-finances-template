# Workflow

## During the month

1. Run **QuickAdd: New financial transaction**.
2. Complete the form once.
3. Update the amount, due date, or status directly in a Base when necessary.

One transaction corresponds to one file. Person, category, and period notes are references and do not need to be edited for each entry.

## At the beginning of a month

1. Run **QuickAdd: Generate financial month**.
2. Enter the period in `YYYY-MM` format.
3. Review the preview.
4. Confirm creation.

The script will not recreate a recurrence already linked to the same period.

## Variable expenses

Edit only the monthly transaction. The next month inherits the latest recorded amount. The recurrence note stores the rule and does not need to follow every variation.

## Closing items

Set paid or received transactions to `completed`. Use `cancelled` to preserve history without including the item in the primary views.
