export type BankFeedTransactionInput = {
  sourceTransactionId: string;
  transactionDate: string;
  amount: number;
  merchantName?: string | null;
  description?: string | null;
  source: string;
  notes?: string | null;
  categoryId?: string | null;
};

export type TransactionUpsertRow = {
  user_id: string;
  category_id: string | null;
  transaction_date: string;
  amount: number;
  merchant_name: string | null;
  description: string | null;
  source: string;
  source_transaction_id: string;
  notes: string | null;
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
    throw new Error("amount must be a finite number.");
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

export function prepareTransactionUpsertRows(params: {
  userId: string;
  transactions: BankFeedTransactionInput[];
}): TransactionUpsertRow[] {
  const { userId, transactions } = params;
  const normalizedUserId = assertRequiredText(userId, "userId");

  return transactions.map((transaction, index) => {
    const source = assertRequiredText(transaction.source, `transactions[${index}].source`);
    const sourceTransactionId = assertRequiredText(
      transaction.sourceTransactionId,
      `transactions[${index}].sourceTransactionId`
    );

    return {
      user_id: normalizedUserId,
      category_id: normalizeText(transaction.categoryId),
      transaction_date: assertValidDate(
        assertRequiredText(
          transaction.transactionDate,
          `transactions[${index}].transactionDate`
        ),
        `transactions[${index}].transactionDate`
      ),
      amount: assertFiniteAmount(transaction.amount),
      merchant_name: normalizeText(transaction.merchantName),
      description: normalizeText(transaction.description),
      source,
      source_transaction_id: sourceTransactionId,
      notes: normalizeText(transaction.notes),
    };
  });
}
