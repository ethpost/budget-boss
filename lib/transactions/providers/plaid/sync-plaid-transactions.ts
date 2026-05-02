import { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePlaidTransactions,
  type NormalizePlaidTransactionsResult,
} from "../../adapters/plaid/normalize-plaid-transactions";
import { getActiveCategories } from "../../../budget-setup/repositories/get-active-categories";
import { categorizeImportedTransactions } from "../../domain/categorize-imported-transactions";
import { prepareTransactionUpsertRows } from "../../domain/prepare-transaction-import";
import { deleteTransactionsBySourceTransactionIds } from "../../repositories/delete-transactions-by-source-transaction-ids";
import { getTransactionCategorizationHistory } from "../../repositories/get-transaction-categorization-history";
import { upsertTransactions } from "../../repositories/upsert-transactions";
import {
  PlaidTransactionsClient,
  PlaidTransactionsSyncRequest,
} from "./plaid-transactions-client";

export type SyncPlaidTransactionsParams = {
  plaidClient: PlaidTransactionsClient;
  supabase: SupabaseClient;
  userId: string;
  accessToken: string;
  cursor?: string | null;
  pageSize?: number;
};

export type SyncPlaidTransactionsResult = {
  fetchedCount: number;
  importedCount: number;
  skippedPendingCount: number;
  autoCategorizedCount: number;
  categorizationNeedsReviewCount: number;
  removedCount: number;
  upsertedCount: number;
  nextCursor: string | null;
};

async function fetchPlaidTransactionsPage(
  plaidClient: PlaidTransactionsClient,
  request: PlaidTransactionsSyncRequest
) {
  const { data } = await plaidClient.transactionsSync(request);
  return data;
}

function dedupeTransactionsBySourceTransactionId(
  transactions: NormalizePlaidTransactionsResult["transactions"]
) {
  const seen = new Set<string>();
  return transactions.filter((transaction) => {
    if (seen.has(transaction.sourceTransactionId)) {
      return false;
    }

    seen.add(transaction.sourceTransactionId);
    return true;
  });
}

export async function syncPlaidTransactions({
  plaidClient,
  supabase,
  userId,
  accessToken,
  cursor = null,
  pageSize = 500,
}: SyncPlaidTransactionsParams): Promise<SyncPlaidTransactionsResult> {
  const collectedTransactions = [];
  const removedSourceTransactionIds: string[] = [];
  let fetchedCount = 0;
  let skippedPendingCount = 0;
  let nextCursor = cursor;

  while (true) {
    const page = await fetchPlaidTransactionsPage(plaidClient, {
      access_token: accessToken,
      cursor: nextCursor ?? undefined,
      count: pageSize,
    });

    fetchedCount += page.added.length + page.modified.length;
    removedSourceTransactionIds.push(
      ...page.removed.map((row) => row.transaction_id)
    );

    const normalized = normalizePlaidTransactions({
      transactions: [...page.added, ...page.modified],
    });
    collectedTransactions.push(...normalized.transactions);
    skippedPendingCount += normalized.skippedPendingCount;

    nextCursor = page.next_cursor;

    if (!page.has_more) {
      break;
    }
  }

  const uniqueTransactions = dedupeTransactionsBySourceTransactionId(
    collectedTransactions
  );

  const [activeCategories, categorizedTransactionHistory] = await Promise.all([
    getActiveCategories(supabase, userId),
    getTransactionCategorizationHistory({
      supabase,
      userId,
      limit: 500,
    }),
  ]);

  const categorization = categorizeImportedTransactions({
    transactions: uniqueTransactions,
    activeCategories,
    categorizedTransactionHistory,
  });

  const rows = prepareTransactionUpsertRows({
    userId,
    transactions: categorization.transactions,
  });

  const { upsertedCount } = await upsertTransactions(supabase, rows);
  const removedCount = await deleteTransactionsBySourceTransactionIds(supabase, {
    userId,
    source: "plaid",
    sourceTransactionIds: removedSourceTransactionIds,
  });

  return {
    fetchedCount,
    importedCount: rows.length,
    skippedPendingCount,
    autoCategorizedCount: categorization.audit.categorizedCount,
    categorizationNeedsReviewCount: categorization.audit.needsReviewCount,
    removedCount,
    upsertedCount,
    nextCursor,
  };
}
