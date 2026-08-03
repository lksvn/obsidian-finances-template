module.exports = async ({ app, quickAddApi }) => {
  const ROOT = "FINANCES";
  const RECURRENCES = ROOT + "/RECURRENCES";
  const TRANSACTIONS = ROOT + "/TRANSACTIONS";
  const PERIODS = ROOT + "/PERIODS";
  const pad = (number) => String(number).padStart(2, "0");
  const now = new Date();
  const defaultPeriod = now.getFullYear() + "-" + pad(now.getMonth() + 1);
  const period = (await quickAddApi.inputPrompt("New financial period (YYYY-MM)", "Example: 2030-09", defaultPeriod))?.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || "")) {
    new Notice("Invalid period. Use YYYY-MM.");
    return;
  }

  const [year, month] = period.split("-").map(Number);
  const periodIndex = year * 12 + month - 1;
  const files = app.vault.getMarkdownFiles();
  const recurrenceFiles = files.filter((file) => file.path.startsWith(RECURRENCES + "/"));
  const existing = new Set();
  const transactionRecords = [];

  for (const file of files.filter((item) => item.path.startsWith(TRANSACTIONS + "/"))) {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    const recordPeriod = String(frontmatter?.period ?? "");
    const links = Array.isArray(frontmatter?.recurrence) ? frontmatter.recurrence : [frontmatter?.recurrence];
    for (const link of links.filter(Boolean)) {
      const match = String(link).match(/\[\[([^|\]]+)/);
      if (!match) continue;
      if (recordPeriod === period) existing.add(match[1]);
      const recordAmount = Number(frontmatter?.amount);
      if (/^\d{4}-\d{2}$/.test(recordPeriod) && Number.isFinite(recordAmount) && frontmatter?.status !== "cancelled") {
        transactionRecords.push({ recurrencePath: match[1], period: recordPeriod, amount: recordAmount });
      }
    }
  }

  const firstLink = (value) => Array.isArray(value) ? value[0] : value;
  const linkPath = (value) => String(firstLink(value) ?? "").match(/\[\[([^|\]]+)/)?.[1] ?? "";
  const linkAlias = (value) => {
    const text = String(firstLink(value) ?? "");
    return text.match(/\|([^\]]+)\]\]/)?.[1] ?? text.match(/([^/|\]]+)\]\]/)?.[1] ?? "";
  };

  const candidates = [];
  for (const file of recurrenceFiles) {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    if (frontmatter?.type !== "financial_recurrence" || frontmatter?.status !== "active" || frontmatter?.generate_transaction !== true) continue;
    if (frontmatter?.accounting === "included_in_bill") continue;
    const start = String(frontmatter?.start ?? "");
    if (!/^\d{4}-\d{2}$/.test(start)) continue;
    const [startYear, startMonth] = start.split("-").map(Number);
    const offset = periodIndex - (startYear * 12 + startMonth - 1);
    if (offset < 0) continue;
    if (frontmatter?.frequency === "yearly" && month !== startMonth) continue;
    const installmentsTotal = Number(frontmatter?.installments_total || 0);
    const installment = installmentsTotal ? offset + 1 : null;
    if (installmentsTotal && installment > installmentsTotal) continue;
    const recurrencePath = file.path.replace(/\.md$/, "");
    if (existing.has(recurrencePath)) continue;

    let effectiveAmount = Number(frontmatter.expected_amount || 0);
    let amountReference = "recurrence";
    if (frontmatter.amount_type === "variable") {
      const latest = transactionRecords
        .filter((record) => record.recurrencePath === recurrencePath && record.period < period)
        .sort((a, b) => b.period.localeCompare(a.period))[0];
      if (latest) {
        effectiveAmount = latest.amount;
        amountReference = latest.period;
      }
    }
    candidates.push({ frontmatter, recurrencePath, installment, installmentsTotal, effectiveAmount, amountReference });
  }

  if (!candidates.length) {
    new Notice("No new transactions: this period is complete or has no active recurrence rules.");
    return;
  }
  candidates.sort((a, b) => (Number(a.frontmatter.due_day || 99) - Number(b.frontmatter.due_day || 99)) || String(a.frontmatter.name).localeCompare(String(b.frontmatter.name), "en"));
  const preview = candidates.map(({ frontmatter, installment, installmentsTotal, effectiveAmount, amountReference }) => {
    const person = linkAlias(frontmatter.person);
    const installmentLabel = installment ? ` (${installment}/${installmentsTotal})` : "";
    const reference = frontmatter.amount_type === "variable" && amountReference !== "recurrence" ? ` · latest: ${amountReference}` : "";
    return `• ${person}: ${frontmatter.transaction_description || frontmatter.name} — $ ${Number(effectiveAmount).toFixed(2)}${installmentLabel}${reference}`;
  });
  const confirmed = await quickAddApi.yesNoPrompt(`Generate ${candidates.length} transactions for ${period}?`, preview.join("\n"));
  if (!confirmed) return;

  const ensureFolder = async (folder) => {
    let current = "";
    for (const part of folder.split("/")) {
      current = current ? current + "/" + part : part;
      if (!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current);
    }
  };
  const yaml = (value) => JSON.stringify(String(value));
  const sanitize = (value) => String(value).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  const folder = `${TRANSACTIONS}/${year}/${pad(month)}`;
  await ensureFolder(folder);

  const periodPath = `${PERIODS}/${period}.md`;
  if (!app.vault.getAbstractFileByPath(periodPath)) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const previousDate = new Date(year, month - 2, 1);
    const previous = previousDate.getFullYear() + "-" + pad(previousDate.getMonth() + 1);
    await app.vault.create(periodPath, `---\ntype: financial_period\nperiod: ${yaml(period)}\n---\n\n# ${monthNames[month - 1]} ${year}\n\nPrevious: [[${PERIODS}/${previous}]]\n\n[[FINANCES/DASHBOARD|Financial dashboard]]\n`);
  }

  let createdCount = 0;
  for (const { frontmatter, recurrencePath, installment, installmentsTotal, effectiveAmount, amountReference } of candidates) {
    const person = linkAlias(frontmatter.person);
    const personPath = linkPath(frontmatter.person);
    const description = String(frontmatter.transaction_description || frontmatter.name);
    const categories = Array.isArray(frontmatter.category) ? frontmatter.category : [frontmatter.category].filter(Boolean);
    const dueDay = Number(frontmatter.due_day || 0);
    const lastDay = new Date(year, month, 0).getDate();
    const dueDate = dueDay ? `${period}-${pad(Math.min(dueDay, lastDay))}` : "";
    const provisional = frontmatter.amount_type === "variable";
    const installmentFields = installment ? `installment: ${installment}\ninstallments_total: ${installmentsTotal}\n` : "";
    const dueField = dueDate ? `due_date: ${dueDate}\n` : "";
    const categoryYaml = categories.map((category) => `  - ${yaml(category)}`).join("\n");
    const referenceField = provisional ? `amount_reference_period: ${yaml(amountReference)}\n` : "";
    const content = `---\nperson:\n  - ${yaml(`[[${personPath}|${person}]]`)}\nmovement: ${yaml(frontmatter.movement || "pay")}\nperiod: ${yaml(period)}\nperiod_note: ${yaml(`[[${PERIODS}/${period}|${period}]]`)}\ndescription: ${yaml(description)}\namount: ${Number(effectiveAmount).toFixed(2)}\n${dueField}status: ${yaml("pending")}\n${installmentFields}category:\n${categoryYaml}\nrecurrence: ${yaml(`[[${recurrencePath}|${description}]]`)}\ndata_origin: generated\nprovisional_amount: ${provisional}\n${referenceField}---\n\n# ${description}\n\n> Generated by QuickAdd from [[${recurrencePath}|${description}]].${provisional ? " Estimated amount: update it when the actual charge arrives." : ""}\n`;
    const baseName = `${period} - ${person} - ${frontmatter.movement || "pay"} - ${sanitize(description)}`;
    let target = `${folder}/${baseName}.md`;
    let suffix = 2;
    while (app.vault.getAbstractFileByPath(target)) target = `${folder}/${baseName} - ${pad(suffix++)}.md`;
    await app.vault.create(target, content);
    createdCount++;
  }
  new Notice(`${createdCount} transactions created for ${period}.`);
};
