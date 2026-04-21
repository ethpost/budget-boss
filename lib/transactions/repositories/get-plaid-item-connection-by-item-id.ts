import { SupabaseClient } from "@supabase/supabase-js";

export type PlaidItemConnection = {
  userId: string;
  itemId: string;
  accessToken: string;
  cursor: string | null;
  institutionName: string | null;
  lastSyncAt: string | null;
  lastWebhookAt: string | null;
};

export async function getPlaidItemConnectionByItemId(
  supabase: SupabaseClient,
  itemId: string
): Promise<PlaidItemConnection | null> {
  const { data, error } = await supabase
    .from("plaid_item_connections")
    .select(
      "user_id, item_id, access_token, cursor, institution_name, last_sync_at, last_webhook_at"
    )
    .eq("item_id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Plaid item connection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    userId: String(data.user_id ?? ""),
    itemId: String(data.item_id ?? ""),
    accessToken: String(data.access_token ?? ""),
    cursor: data.cursor as string | null,
    institutionName: data.institution_name as string | null,
    lastSyncAt: data.last_sync_at as string | null,
    lastWebhookAt: data.last_webhook_at as string | null,
  };
}
