import { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePlaidTransactions,
  type NormalizePlaidTransactionsResult,
} from "../../adapters/plaid/normalize-plaid-transactions";
import { prepareTransactionUpsertRows } from "../../domain/prepare-transaction-import";
import { deleteTransactionsBySourceTransactionIds } from "../../repositories/delete-transactions-by-source-transaction-ids";
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
  const rows = prepareTransactionUpsertRows({
    userId,
    transactions: uniqueTransactions,
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
    removedCount,
    upsertedCount,
    nextCursor,
  };
}
