/** Domain contracts for immutable double-entry accounting. */
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export interface LedgerAccount {
  id: string; businessId: string; code: string; name: string; type: AccountType; active: boolean;
}
export interface JournalLine {
  accountId: string; debitMinor: number; creditMinor: number; description?: string;
}
export interface JournalEntry {
  id: string; businessId: string; entryDate: string; memo: string; lines: JournalLine[]; reversalOf?: string; createdAt: string;
}
export interface JournalValidation {
  valid: boolean; debitTotalMinor: number; creditTotalMinor: number; errors: string[];
}
/** Structural validation only; authorization and account ownership belong server-side. */
export function validateJournal(entry: JournalEntry, knownAccountIds: ReadonlySet<string>): JournalValidation {
  const errors: string[] = [];
  let debitTotalMinor = 0;
  let creditTotalMinor = 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate)) errors.push("Invalid journal date.");
  if (!entry.businessId.trim()) errors.push("Business ID is required.");
  if (!entry.memo.trim()) errors.push("Journal memo is required.");
  if (entry.lines.length < 2) errors.push("At least two journal lines are required.");
  for (const line of entry.lines) {
    const debit = line.debitMinor, credit = line.creditMinor;
    if (!knownAccountIds.has(line.accountId)) errors.push(`Unknown account: ${line.accountId}`);
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit) || debit < 0 || credit < 0) {
      errors.push("Amounts must be non-negative safe integers."); continue;
    }
    if ((debit > 0) === (credit > 0)) errors.push("Each line must contain exactly one positive side.");
    debitTotalMinor += debit; creditTotalMinor += credit;
  }
  if (!Number.isSafeInteger(debitTotalMinor) || !Number.isSafeInteger(creditTotalMinor)) errors.push("Journal totals exceed safe integer precision.");
  else if (debitTotalMinor <= 0 || debitTotalMinor !== creditTotalMinor) errors.push("Journal debits and credits must balance.");
  return { valid: errors.length === 0, debitTotalMinor, creditTotalMinor, errors };
}
