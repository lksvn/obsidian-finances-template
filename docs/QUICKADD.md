# QuickAdd configuration

Configure QuickAdd through its interface so this template never replaces an existing `.obsidian/plugins/quickadd/data.json`.

## New financial transaction

1. Open **Settings → QuickAdd**.
2. Create a **Macro** choice named `New financial transaction`.
3. Open the Macro Builder.
4. Under **User scripts**, select `FINANCES/SCRIPTS/new-financial-transaction.js` and add it.
5. Save it and enable the lightning icon to expose it in the command palette.

## Generate financial month

Repeat the process using the name `Generate financial month` and script `FINANCES/SCRIPTS/generate-financial-month.js`.

## Synchronization

The scripts live inside the vault and can be synchronized normally. QuickAdd stores its choices in `.obsidian/plugins/quickadd/data.json`; synchronize that folder only if you want identical choices on every device.
