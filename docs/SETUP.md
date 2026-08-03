# Installation

## 1. Copy the files

Copy the contents of `vault/` into the root of your vault. Add a link to `FINANCES/DASHBOARD.md` from your existing home note if desired.

## 2. Enable plugins

- **Bases**: built-in Obsidian plugin.
- **QuickAdd**: community plugin required by the scripts.
- **Charts for Bases**: optional; only required by the chart views.

## 3. Add people

Copy `FINANCES/TEMPLATES/Person.md` to `FINANCES/PEOPLE/Name.md` inside your vault. Update the `name` property and heading. At least one person note is required before creating the first transaction.

## 4. Review categories

The template includes generic starter categories. Delete categories you do not use and create new ones by copying an existing category note. Keep `type: financial_category`.

## 5. Configure QuickAdd

Follow [QUICKADD.md](QUICKADD.md). Plugin configuration is intentionally not installed automatically, so an existing `.obsidian/plugins/quickadd/data.json` is never overwritten.

## 6. Set the homepage

Optionally install Homepage and select `FINANCES/DASHBOARD.md`.
