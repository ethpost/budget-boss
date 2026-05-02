import { SupabaseClient } from "@supabase/supabase-js";
import { type PlaidApi } from "plaid";
import { getPlaidItemConnectionByItemId } from "../../repositories/get-plaid-item-connection-by-item-id";
import { syncPlaidTransactions } from "./sync-plaid-transactions";
import { upsertPlaidItemConnection } from "../../repositories/upsert-plaid-item-connection";

export type PlaidTransactionsWebhookPayload = {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  initial_update_complete?: boolean;
  historical_update_complete?: boolean;
  user_id?: string;
};

export type HandlePlaidTransactionsWebhookResult =
  | {
      handled: false;
      reason: string;
    }
  | {
      handled: true;
      itemId: string;
      userId: string;
      fetchedCount: number;
      importedCount: number;
      removedCount: number;
      skippedPendingCount: number;
      autoCategorizedCount: number;
      categorizationNeedsReviewCount: number;
      upsertedCount: number;
      nextCursor: string | null;
    };

export async function handlePlaidTransactionsWebhook(params: {
  plaidClient: PlaidApi;
  supabase: SupabaseClient;
  payload: PlaidTransactionsWebhookPayload;
}): Promise<HandlePlaidTransactionsWebhookResult> {
  if (
    params.payload.webhook_type !== "TRANSACTIONS" ||
    params.payload.webhook_code !== "SYNC_UPDATES_AVAILABLE"
  ) {
    return {
      handled: false,
      reason: "Unsupported webhook event.",
    };
  }

  const itemId = params.payload.item_id;
  if (!itemId) {
    return {
      handled: false,
      reason: "Missing item_id.",
    };
  }

  const connection = await getPlaidItemConnectionByItemId(
    params.supabase,
    itemId
  );

  if (!connection) {
    return {
      handled: false,
      reason: "No stored Plaid connection for item.",
    };
  }

  const result = await syncPlaidTransactions({
    plaidClient: params.plaidClient,
    supabase: params.supabase,
    userId: connection.userId,
    accessToken: connection.accessToken,
    cursor: connection.cursor,
  });

  const completedAt = new Date().toISOString();
  await upsertPlaidItemConnection({
    supabase: params.supabase,
    userId: connection.userId,
    itemId: connection.itemId,
    accessToken: connection.accessToken,
    cursor: result.nextCursor,
    institutionName: connection.institutionName,
    lastSyncAt: completedAt,
    lastWebhookAt: completedAt,
  });

  return {
    handled: true,
    itemId: connection.itemId,
    userId: connection.userId,
    fetchedCount: result.fetchedCount,
    importedCount: result.importedCount,
    removedCount: result.removedCount,
    skippedPendingCount: result.skippedPendingCount,
    autoCategorizedCount: result.autoCategorizedCount,
    categorizationNeedsReviewCount: result.categorizationNeedsReviewCount,
    upsertedCount: result.upsertedCount,
    nextCursor: result.nextCursor,
  };
}
