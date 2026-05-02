export type UncategorizedTransactionRow = {
  sourceTransactionId: string;
  transactionDate: string;
  amount: number;
  merchantName: string | null;
  description: string | null;
};

export type UncategorizedTransactionGroup = {
  groupKey: string;
  displayName: string;
  transactionCount: number;
  totalAmount: number;
  latestTransactionDate: string;
  sourceTransactionIds: string[];
  sampleDescriptions: string[];
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[#*][a-z0-9-]+/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildGroupKey(row: UncategorizedTransactionRow): string {
  const normalized =
    normalizeText(row.merchantName) || normalizeText(row.description);

  return normalized || `transaction:${row.sourceTransactionId}`;
}

function buildDisplayName(row: UncategorizedTransactionRow): string {
  return row.merchantName?.trim() || row.description?.trim() || "Unknown merchant";
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildUncategorizedTransactionGroups(
  rows: UncategorizedTransactionRow[]
): UncategorizedTransactionGroup[] {
  const groupsByKey = new Map<string, UncategorizedTransactionGroup>();

  for (const row of rows) {
    const groupKey = buildGroupKey(row);
    const existing = groupsByKey.get(groupKey);
    const description = row.description?.trim();

    if (!existing) {
      groupsByKey.set(groupKey, {
        groupKey,
        displayName: buildDisplayName(row),
        transactionCount: 1,
        totalAmount: roundCurrency(row.amount),
        latestTransactionDate: row.transactionDate,
        sourceTransactionIds: [row.sourceTransactionId],
        sampleDescriptions: description ? [description] : [],
      });
      continue;
    }

    existing.transactionCount += 1;
    existing.totalAmount = roundCurrency(existing.totalAmount + row.amount);
    existing.latestTransactionDate =
      row.transactionDate > existing.latestTransactionDate
        ? row.transactionDate
        : existing.latestTransactionDate;
    existing.sourceTransactionIds.push(row.sourceTransactionId);

    if (
      description &&
      !existing.sampleDescriptions.includes(description) &&
      existing.sampleDescriptions.length < 3
    ) {
      existing.sampleDescriptions.push(description);
    }
  }

  return Array.from(groupsByKey.values()).sort((a, b) => {
    if (a.latestTransactionDate !== b.latestTransactionDate) {
      return b.latestTransactionDate.localeCompare(a.latestTransactionDate);
    }

    return b.transactionCount - a.transactionCount;
  });
}
