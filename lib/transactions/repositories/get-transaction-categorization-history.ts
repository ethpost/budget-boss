import { SupabaseClient } from "@supabase/supabase-js";
import { CategorizationHistoryRow } from "../domain/categorize-imported-transactions";

export async function getTransactionCategorizationHistory(params: {
  supabase: SupabaseClient;
  userId: string;
  limit?: number;
}): Promise<CategorizationHistoryRow[]> {
  const { data, error } = await params.supabase
    .from("transactions")
    .select("merchant_name, description, category_id")
    .eq("user_id", params.userId)
    .not("category_id", "is", null)
    .order("transaction_date", { ascending: false })
    .limit(params.limit ?? 500);

  if (error) {
    throw new Error(
      `Failed to load transaction categorization history: ${error.message}`
    );
  }

  return (data ?? []).map((row: any) => ({
    merchantName: row.merchant_name as string | null,
    description: row.description as string | null,
    categoryId: String(row.category_id ?? ""),
  }));
}
