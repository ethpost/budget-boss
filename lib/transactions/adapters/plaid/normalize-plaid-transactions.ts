import { BankFeedTransactionInput } from "../../domain/prepare-transaction-import";

export type PlaidTransactionInput = {
  transaction_id: string;
  date: string;
  amount: number;
  merchant_name?: string | null;
  name?: string | null;
  pending?: boolean | null;
};

export type PlaidTransactionPayload = {
  transactions: PlaidTransactionInput[];
};

export type NormalizePlaidTransactionsResult = {
  transactions: BankFeedTransactionInput[];
  skippedPendingCount: number;
};

function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertValidDate(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} must be in YYYY-MM-DD format.`);
  }

  return normalized;
}

function assertFiniteAmount(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Plaid transaction amount must be a finite number.");
  }

  return Math.round(value * 100) / 100;
}

function assertRequiredText(value: string | null | undefined, fieldName: string): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

export function normalizePlaidTransactions(
  payload: PlaidTransactionPayload
): NormalizePlaidTransactionsResult {
  const transactions = payload.transactions ?? [];

  const normalizedTransactions: BankFeedTransactionInput[] = [];
  let skippedPendingCount = 0;

  for (const [index, transaction] of transactions.entries()) {
    if (transaction.pending) {
      skippedPendingCount += 1;
      continue;
    }

    normalizedTransactions.push({
      source: "plaid",
      sourceTransactionId: assertRequiredText(
        transaction.transaction_id,
        `transactions[${index}].transaction_id`
      ),
      transactionDate: assertValidDate(
        assertRequiredText(transaction.date, `transactions[${index}].date`),
        `transactions[${index}].date`
      ),
      amount: assertFiniteAmount(transaction.amount),
      merchantName:
        normalizeText(transaction.merchant_name) ?? normalizeText(transaction.name),
      description: normalizeText(transaction.name),
      notes: null,
      categoryId: null,
    });
  }

  return {
    transactions: normalizedTransactions,
    skippedPendingCount,
  };
}
