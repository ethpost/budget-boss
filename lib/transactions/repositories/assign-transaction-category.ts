import { SupabaseClient } from "@supabase/supabase-js";

export async function assignTransactionCategory(params: {
  supabase: SupabaseClient;
  userId: string;
  categoryId: string;
  source: string;
  sourceTransactionIds: string[];
}): Promise<{ updatedCount: number }> {
  const sourceTransactionIds = Array.from(
    new Set(params.sourceTransactionIds.map((id) => id.trim()).filter(Boolean))
  );

  if (sourceTransactionIds.length === 0) {
    return { updatedCount: 0 };
  }

  const { data, error } = await params.supabase
    .from("transactions")
    .update({
      category_id: params.categoryId,
    })
    .eq("user_id", params.userId)
    .eq("source", params.source)
    .in("source_transaction_id", sourceTransactionIds)
    .select("id");

  if (error) {
    throw new Error(`Failed to assign transaction category: ${error.message}`);
  }

  return {
    updatedCount: data?.length ?? sourceTransactionIds.length,
  };
}
