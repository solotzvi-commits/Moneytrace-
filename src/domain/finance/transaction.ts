/** Canonical transaction contract for new MONEYTRACE domain modules. */
export type TransactionKind = "income" | "expense";
export interface MoneyAmount {
  /** Integer minor units (agorot/cents); avoid floating-point money arithmetic. */
  minorUnits: number;
  currency: string;
}
export interface FinanceTransaction {
  id: string;
  occurredOn: string;
  kind: TransactionKind;
  description: string;
  categoryId: string;
  amount: MoneyAmount;
  accountId?: string;
  createdAt: string;
  updatedAt: string;
}
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function validateTransaction(transaction: FinanceTransaction): string[] {
  const errors: string[] = [];
  if (!transaction.id.trim()) errors.push("Transaction ID is required.");
  if (!isIsoDate(transaction.occurredOn)) errors.push("A valid ISO date is required.");
  if (!transaction.description.trim()) errors.push("Description is required.");
  if (!transaction.categoryId.trim()) errors.push("Category is required.");
  if (!Number.isSafeInteger(transaction.amount.minorUnits) || transaction.amount.minorUnits <= 0) errors.push("Amount must be a positive safe integer in minor units.");
  if (!/^[A-Z]{3}$/.test(transaction.amount.currency)) errors.push("Currency must be a three-letter ISO code.");
  return errors;
}
