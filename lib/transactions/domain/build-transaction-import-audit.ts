import { RecentTransactionRow } from "../repositories/get-recent-transactions";

export type TransactionImportAuditSource = {
  source: string;
  count: number;
};

export type TransactionImportAuditCategory = {
  categoryId: string;
  count: number;
};

export type TransactionImportAudit = {
  transactionCount: number;
  totalAmount: number;
  categorizedTransactionCount: number;
  uncategorizedTransactionCount: number;
  noteCount: number;
  sourceCount: number;
  sources: TransactionImportAuditSource[];
  categories: TransactionImportAuditCategory[];
  earliestTransactionDate: string | null;
  latestTransactionDate: string | null;
};

function compareSourceCounts(
  left: TransactionImportAuditSource,
  right: TransactionImportAuditSource
): number {
  if (left.count !== right.count) {
    return right.count - left.count;
  }

  return left.source.localeCompare(right.source);
}

function compareCategoryCounts(
  left: TransactionImportAuditCategory,
  right: TransactionImportAuditCategory
): number {
  if (left.count !== right.count) {
    return right.count - left.count;
  }

  return left.categoryId.localeCompare(right.categoryId);
}

export function buildTransactionImportAudit(
  transactions: RecentTransactionRow[]
): TransactionImportAudit {
  const sourceCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  let totalAmount = 0;
  let categorizedTransactionCount = 0;
  let noteCount = 0;
  let earliestTransactionDate: string | null = null;
  let latestTransactionDate: string | null = null;

  for (const transaction of transactions) {
    totalAmount += transaction.amount;

    if (transaction.categoryId) {
      categorizedTransactionCount += 1;
      const currentCategoryCount = categoryCounts.get(transaction.categoryId) ?? 0;
      categoryCounts.set(transaction.categoryId, currentCategoryCount + 1);
    }

    if (transaction.notes) {
      noteCount += 1;
    }

    const currentSourceCount = sourceCounts.get(transaction.source) ?? 0;
    sourceCounts.set(transaction.source, currentSourceCount + 1);

    if (
      earliestTransactionDate === null ||
      transaction.transactionDate < earliestTransactionDate
    ) {
      earliestTransactionDate = transaction.transactionDate;
    }

    if (
      latestTransactionDate === null ||
      transaction.transactionDate > latestTransactionDate
    ) {
      latestTransactionDate = transaction.transactionDate;
    }
  }

  const sources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort(compareSourceCounts);
  const categories = Array.from(categoryCounts.entries())
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort(compareCategoryCounts);

  return {
    transactionCount: transactions.length,
    totalAmount,
    categorizedTransactionCount,
    uncategorizedTransactionCount:
      transactions.length - categorizedTransactionCount,
    noteCount,
    sourceCount: sources.length,
    sources,
    categories,
    earliestTransactionDate,
    latestTransactionDate,
  };
}
