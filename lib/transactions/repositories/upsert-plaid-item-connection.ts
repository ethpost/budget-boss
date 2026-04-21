import { SupabaseClient } from "@supabase/supabase-js";

export type UpsertPlaidItemConnectionParams = {
  supabase: SupabaseClient;
  userId: string;
  itemId: string;
  accessToken: string;
  cursor?: string | null;
  institutionName?: string | null;
  lastSyncAt?: string | null;
  lastWebhookAt?: string | null;
};

export async function upsertPlaidItemConnection(
  params: UpsertPlaidItemConnectionParams
): Promise<void> {
  const { error } = await params.supabase.from("plaid_item_connections").upsert(
    {
      user_id: params.userId,
      item_id: params.itemId,
      access_token: params.accessToken,
      cursor: params.cursor ?? null,
      institution_name: params.institutionName ?? null,
      last_sync_at: params.lastSyncAt ?? null,
      last_webhook_at: params.lastWebhookAt ?? null,
    },
    {
      onConflict: "item_id",
    }
  );

  if (error) {
    throw new Error(`Failed to save Plaid item connection: ${error.message}`);
  }
}
