module.exports = async function ({ app, quickAddApi }) {
  const ROOT = "FINANCES";
  const files = app.vault.getMarkdownFiles();
  const chooseNote = async (folder, label) => {
    const options = files.filter((file) => file.path.startsWith(`${ROOT}/${folder}/`) && file.basename !== "INDEX");
    const file = await quickAddApi.suggester(options.map((item) => item.basename), options, false, label);
    return file ? { path: file.path.replace(/\.md$/, ""), name: file.basename } : null;
  };
  const ask = async (label, placeholder = "", value = "") => (await quickAddApi.inputPrompt(label, placeholder, value))?.trim();
  const yaml = (value) => JSON.stringify(String(value));
  const parseAmount = (value) => Number(String(value).replace(/\s/g, "").replace(",", "."));
  const sanitize = (value) => String(value).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();

  const name = await ask("Recurrence name");
  if (!name) return;
  const person = await chooseNote("PEOPLE", "Person");
  const category = await chooseNote("CATEGORIES", "Category");
  if (!person || !category) return;

  const frequency = await quickAddApi.suggester(["Monthly", "Yearly"], ["monthly", "yearly"], false, "Frequency");
  if (!frequency) return;
  const accounting = await quickAddApi.suggester(
    ["Generate an individual transaction", "Already included in a card bill"],
    ["individual_transaction", "included_in_bill"],
    false,
    "Accounting"
  );
  if (!accounting) return;

  const amountType = await quickAddApi.suggester(["Fixed amount", "Variable amount"], ["fixed", "variable"], false, "Amount type");
  if (!amountType) return;
  const amount = parseAmount(await ask("Expected amount", "Example: 129.90"));
  if (!Number.isFinite(amount) || amount <= 0) return new Notice("Invalid amount.");
  const dueDay = Number(await ask("Due or charge day", "1 to 31"));
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return new Notice("Invalid day. Use a number from 1 to 31.");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = await ask("Starting period (YYYY-MM)", "Example: 2030-01", currentMonth);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(start || "")) return new Notice("Invalid period. Use YYYY-MM.");

  let installments = 0;
  if (frequency === "monthly" && accounting === "individual_transaction") {
    const value = await ask("Total installments (optional)", "Leave empty if it does not end");
    if (value) {
      installments = Number(value);
      if (!Number.isInteger(installments) || installments < 1) return new Notice("Invalid installment count.");
    }
  }
  const paymentMethod = await ask("Payment method (optional)", "Example: bank debit");

  const baseName = `${sanitize(name)} — ${sanitize(person.name)}`;
  const path = `${ROOT}/RECURRENCES/${baseName}.md`;
  if (app.vault.getAbstractFileByPath(path)) return new Notice("This recurrence already exists.");

  const generateTransaction = accounting === "individual_transaction";
  const content = `---\ntype: financial_recurrence\nname: ${yaml(name)}\ntransaction_description: ${yaml(name)}\nstatus: active\nfrequency: ${frequency}\nmovement: pay\ngenerate_transaction: ${generateTransaction}\namount_type: ${amountType}\nexpected_amount: ${amount.toFixed(2)}\ndue_day: ${dueDay}\nperson:\n  - ${yaml(`[[${person.path}|${person.name}]]`)}\ncategory:\n  - ${yaml(`[[${category.path}|${category.name}]]`)}\naccounting: ${accounting}\nstart: ${start}\n${installments ? `installments_total: ${installments}\n` : ""}${paymentMethod ? `payment_method: ${yaml(paymentMethod)}\n` : ""}---\n\n# ${name}\n\n[[FINANCES/RECURRENCES/INDEX|← Recurrence rules]] · [[FINANCES/DASHBOARD|Financial dashboard]]\n`;
  await app.vault.create(path, content);
  await app.workspace.getLeaf(false).openFile(app.vault.getAbstractFileByPath(path));
  new Notice(`Recurrence created: ${name}.`);
};
