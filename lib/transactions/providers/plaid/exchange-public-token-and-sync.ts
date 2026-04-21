import { SupabaseClient } from "@supabase/supabase-js";
import { type PlaidApi } from "plaid";
import { syncPlaidTransactions } from "./sync-plaid-transactions";

export type ExchangePublicTokenAndSyncParams = {
  plaidClient: PlaidApi;
  supabase: SupabaseClient;
  userId: string;
  publicToken: string;
  accessTokenCursor?: string | null;
};

export async function exchangePublicTokenAndSync({
  plaidClient,
  supabase,
  userId,
  publicToken,
  accessTokenCursor = null,
}: ExchangePublicTokenAndSyncParams) {
  const exchange = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchange.data.access_token;
  const result = await syncPlaidTransactions({
    plaidClient,
    supabase,
    userId,
    accessToken,
    cursor: accessTokenCursor,
  });

  return {
    accessToken,
    itemId: exchange.data.item_id,
    ...result,
  };
}
