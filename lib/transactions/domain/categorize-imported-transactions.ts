import { ActiveCategoryRow } from "../../budget-setup/repositories/get-active-categories";
import { BankFeedTransactionInput } from "./prepare-transaction-import";

export type CategorizationSource =
  | "learned_merchant"
  | "plaid_metadata"
  | "category_keyword"
  | "none";

export type CategorizationConfidence = "high" | "medium" | "low";

export type CategorizationHistoryRow = {
  merchantName: string | null;
  description: string | null;
  categoryId: string;
};

export type CategorizationDecision = {
  sourceTransactionId: string;
  suggestedCategoryId: string | null;
  categorizationSource: CategorizationSource;
  categorizationConfidence: CategorizationConfidence;
  needsReview: boolean;
  reviewReason: string | null;
};

export type CategorizeImportedTransactionsResult = {
  transactions: BankFeedTransactionInput[];
  decisions: CategorizationDecision[];
  audit: {
    categorizedCount: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
    needsReviewCount: number;
  };
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

function getMerchantKey(transaction: {
  merchantName?: string | null;
  description?: string | null;
}): string | null {
  const normalized = normalizeText(transaction.merchantName ?? transaction.description);
  return normalized.length > 0 ? normalized : null;
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

function buildLearnedMerchantMap(
  historyRows: CategorizationHistoryRow[]
): Map<string, string | null> {
  const categoryIdsByMerchantKey = new Map<string, Set<string>>();

  for (const row of historyRows) {
    const merchantKey = getMerchantKey(row);
    if (!merchantKey) continue;

    const categoryIds = categoryIdsByMerchantKey.get(merchantKey) ?? new Set<string>();
    categoryIds.add(row.categoryId);
    categoryIdsByMerchantKey.set(merchantKey, categoryIds);
  }

  const learnedMerchantMap = new Map<string, string | null>();
  for (const [merchantKey, categoryIds] of categoryIdsByMerchantKey.entries()) {
    learnedMerchantMap.set(
      merchantKey,
      categoryIds.size === 1 ? Array.from(categoryIds)[0] : null
    );
  }

  return learnedMerchantMap;
}

function findLearnedMerchantCategory(params: {
  merchantKey: string;
  learnedMerchantMap: Map<string, string | null>;
}): {
  found: boolean;
  categoryId: string | null;
} {
  if (params.learnedMerchantMap.has(params.merchantKey)) {
    return {
      found: true,
      categoryId: params.learnedMerchantMap.get(params.merchantKey) ?? null,
    };
  }

  const matchedCategoryIds = new Set<string | null>();
  for (const [learnedMerchantKey, categoryId] of params.learnedMerchantMap.entries()) {
    if (
      params.merchantKey.startsWith(learnedMerchantKey) ||
      learnedMerchantKey.startsWith(params.merchantKey)
    ) {
      matchedCategoryIds.add(categoryId);
    }
  }

  if (matchedCategoryIds.size === 0) {
    return {
      found: false,
      categoryId: null,
    };
  }

  return {
    found: true,
    categoryId:
      matchedCategoryIds.size === 1 ? Array.from(matchedCategoryIds)[0] : null,
  };
}

function findCategoryByMetadata(params: {
  transaction: BankFeedTransactionInput;
  categories: ActiveCategoryRow[];
}): string | null {
  const metadataText = [
    params.transaction.plaidCategoryPrimary,
    params.transaction.plaidCategoryDetailed,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  if (!metadataText) return null;

  const metadataTokens = tokenize(metadataText);
  for (const category of params.categories) {
    const categoryTokens = tokenize(category.categoryName);
    for (const token of categoryTokens) {
      if (metadataTokens.has(token)) {
        return category.categoryId;
      }
    }
  }

  return null;
}

function findCategoryByKeyword(params: {
  transaction: BankFeedTransactionInput;
  categories: ActiveCategoryRow[];
}): string | null {
  const transactionText = normalizeText(
    `${params.transaction.merchantName ?? ""} ${params.transaction.description ?? ""}`
  );
  if (!transactionText) return null;

  const transactionTokens = tokenize(transactionText);
  for (const category of params.categories) {
    const categoryTokens = tokenize(category.categoryName);
    for (const token of categoryTokens) {
      if (transactionTokens.has(token)) {
        return category.categoryId;
      }
    }
  }

  return null;
}

function buildDecision(params: {
  transaction: BankFeedTransactionInput;
  categories: ActiveCategoryRow[];
  learnedMerchantMap: Map<string, string | null>;
}): CategorizationDecision {
  const merchantKey = getMerchantKey(params.transaction);

  if (merchantKey) {
    const learnedMerchantMatch = findLearnedMerchantCategory({
      merchantKey,
      learnedMerchantMap: params.learnedMerchantMap,
    });

    if (learnedMerchantMatch.found && learnedMerchantMatch.categoryId) {
      return {
        sourceTransactionId: params.transaction.sourceTransactionId,
        suggestedCategoryId: learnedMerchantMatch.categoryId,
        categorizationSource: "learned_merchant",
        categorizationConfidence: "high",
        needsReview: false,
        reviewReason: null,
      };
    }

    if (learnedMerchantMatch.found) {
      return {
        sourceTransactionId: params.transaction.sourceTransactionId,
        suggestedCategoryId: null,
        categorizationSource: "learned_merchant",
        categorizationConfidence: "low",
        needsReview: true,
        reviewReason: "Prior transactions for this merchant use multiple categories.",
      };
    }
  }

  const metadataCategoryId = findCategoryByMetadata(params);
  if (metadataCategoryId) {
    return {
      sourceTransactionId: params.transaction.sourceTransactionId,
      suggestedCategoryId: metadataCategoryId,
      categorizationSource: "plaid_metadata",
      categorizationConfidence: "medium",
      needsReview: false,
      reviewReason: null,
    };
  }

  const keywordCategoryId = findCategoryByKeyword(params);
  if (keywordCategoryId) {
    return {
      sourceTransactionId: params.transaction.sourceTransactionId,
      suggestedCategoryId: keywordCategoryId,
      categorizationSource: "category_keyword",
      categorizationConfidence: "medium",
      needsReview: false,
      reviewReason: null,
    };
  }

  return {
    sourceTransactionId: params.transaction.sourceTransactionId,
    suggestedCategoryId: null,
    categorizationSource: "none",
    categorizationConfidence: "low",
    needsReview: true,
    reviewReason: "No reliable category match found.",
  };
}

export function categorizeImportedTransactions(params: {
  transactions: BankFeedTransactionInput[];
  activeCategories: ActiveCategoryRow[];
  categorizedTransactionHistory: CategorizationHistoryRow[];
}): CategorizeImportedTransactionsResult {
  const learnedMerchantMap = buildLearnedMerchantMap(
    params.categorizedTransactionHistory
  );

  const decisions = params.transactions.map((transaction) =>
    buildDecision({
      transaction,
      categories: params.activeCategories,
      learnedMerchantMap,
    })
  );

  const decisionBySourceTransactionId = new Map(
    decisions.map((decision) => [decision.sourceTransactionId, decision])
  );

  const transactions = params.transactions.map((transaction) => {
    if (transaction.categoryId) return transaction;

    const decision = decisionBySourceTransactionId.get(
      transaction.sourceTransactionId
    );

    return {
      ...transaction,
      categoryId: decision?.suggestedCategoryId ?? null,
    };
  });

  return {
    transactions,
    decisions,
    audit: {
      categorizedCount: decisions.filter((decision) => decision.suggestedCategoryId)
        .length,
      highConfidenceCount: decisions.filter(
        (decision) => decision.categorizationConfidence === "high"
      ).length,
      mediumConfidenceCount: decisions.filter(
        (decision) => decision.categorizationConfidence === "medium"
      ).length,
      lowConfidenceCount: decisions.filter(
        (decision) => decision.categorizationConfidence === "low"
      ).length,
      needsReviewCount: decisions.filter((decision) => decision.needsReview).length,
    },
  };
}
