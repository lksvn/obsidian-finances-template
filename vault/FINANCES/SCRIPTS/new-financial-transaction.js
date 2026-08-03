module.exports = async ({ app, quickAddApi }) => {
  const ROOT = "FINANCES";
  const peopleFiles = app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(ROOT + "/PEOPLE/") && file.basename !== "INDEX");
  const categoryFiles = app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(ROOT + "/CATEGORIES/") && file.basename !== "INDEX");

  if (!peopleFiles.length) {
    new Notice("Create at least one note in FINANCES/PEOPLE before adding a transaction.");
    return;
  }

  const person = await quickAddApi.suggester(peopleFiles.map((file) => file.basename), peopleFiles);
  if (!person) return;
  const movement = await quickAddApi.suggester(["💸 Pay", "💰 Receive"], ["pay", "receive"]);
  if (!movement) return;
  const description = (await quickAddApi.inputPrompt("Display name", "Name shown in the dashboard"))?.trim();
  if (!description) return;
  const rawAmount = (await quickAddApi.inputPrompt("Amount", "Example: 125.90"))?.trim().replace(",", ".");
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    new Notice("Invalid amount.");
    return;
  }

  const category = await quickAddApi.suggester(categoryFiles.map((file) => file.basename), categoryFiles);
  if (!category) return;
  const dueDate = (await quickAddApi.inputPrompt("Optional due date", "YYYY-MM-DD"))?.trim();
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    new Notice("Invalid due date.");
    return;
  }
  const status = await quickAddApi.suggester(["🟡 Pending", "🟢 Completed", "⚫ Cancelled"], ["pending", "completed", "cancelled"]);
  if (!status) return;

  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const referenceDate = dueDate || localDate;
  const period = referenceDate.slice(0, 7);
  const [year, month] = period.split("-");
  const periodPath = `${ROOT}/PERIODS/${period}.md`;

  const ensureFolder = async (folder) => {
    let current = "";
    for (const part of folder.split("/")) {
      current = current ? current + "/" + part : part;
      if (!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current);
    }
  };
  await ensureFolder(`${ROOT}/TRANSACTIONS/${year}/${month}`);
  await ensureFolder(`${ROOT}/PERIODS`);
  if (!app.vault.getAbstractFileByPath(periodPath)) {
    await app.vault.create(periodPath, `---\ntype: financial_period\nperiod: "${period}"\n---\n\n# ${period}\n\n[[FINANCES/DASHBOARD|Financial dashboard]]\n`);
  }

  const yaml = (value) => JSON.stringify(String(value));
  const sanitize = (value) => String(value).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  const dueField = dueDate ? `due_date: ${dueDate}\n` : "";
  const content = `---\nperson:\n  - ${yaml(`[[${person.path.replace(/\.md$/, "")}|${person.basename}]]`)}\nmovement: ${yaml(movement)}\nperiod: ${yaml(period)}\nperiod_note: ${yaml(`[[${ROOT}/PERIODS/${period}|${period}]]`)}\ndescription: ${yaml(description)}\namount: ${amount.toFixed(2)}\n${dueField}status: ${yaml(status)}\ncategory:\n  - ${yaml(`[[${category.path.replace(/\.md$/, "")}|${category.basename}]]`)}\n---\n\n# ${description}\n`;
  const folder = `${ROOT}/TRANSACTIONS/${year}/${month}`;
  const baseName = `${period} - ${person.basename} - ${movement} - ${sanitize(description)}`;
  let target = `${folder}/${baseName}.md`;
  let suffix = 2;
  while (app.vault.getAbstractFileByPath(target)) target = `${folder}/${baseName} - ${String(suffix++).padStart(2, "0")}.md`;
  const created = await app.vault.create(target, content);
  new Notice(`Transaction created: ${description}`);
  await app.workspace.getLeaf(false).openFile(created);
};
