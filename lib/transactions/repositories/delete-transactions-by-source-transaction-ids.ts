import { SupabaseClient } from "@supabase/supabase-js";

export async function deleteTransactionsBySourceTransactionIds(
  supabase: SupabaseClient,
  params: {
    userId: string;
    source: string;
    sourceTransactionIds: string[];
  }
): Promise<number> {
  const uniqueIds = Array.from(
    new Set(params.sourceTransactionIds.map((id) => id.trim()).filter(Boolean))
  );

  if (uniqueIds.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", params.userId)
    .eq("source", params.source)
    .in("source_transaction_id", uniqueIds);

  if (error) {
    throw new Error(`Failed to delete removed plaid transactions: ${error.message}`);
  }

  return uniqueIds.length;
}
