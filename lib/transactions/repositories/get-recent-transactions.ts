import { SupabaseClient } from "@supabase/supabase-js";

export type RecentTransactionRow = {
  transactionDate: string;
  amount: number;
  merchantName: string | null;
  description: string | null;
  source: string;
  sourceTransactionId: string;
  notes: string | null;
  categoryId: string | null;
};

export type GetRecentTransactionsParams = {
  supabase: SupabaseClient;
  userId: string;
  source?: string | null;
  limit?: number;
};

export async function getRecentTransactions({
  supabase,
  userId,
  source = null,
  limit = 8,
}: GetRecentTransactionsParams): Promise<RecentTransactionRow[]> {
  let query = supabase
    .from("transactions")
    .select(
      "transaction_date, amount, merchant_name, description, source, source_transaction_id, notes, category_id"
    )
    .eq("user_id", userId);

  if (source) {
    query = query.eq("source", source);
  }

  const { data, error } = await query
    .order("transaction_date", { ascending: false })
    .order("source_transaction_id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load recent transactions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    transactionDate: String(row.transaction_date),
    amount: Number(row.amount ?? 0),
    merchantName: row.merchant_name as string | null,
    description: row.description as string | null,
    source: String(row.source ?? ""),
    sourceTransactionId: String(row.source_transaction_id ?? ""),
    notes: row.notes as string | null,
    categoryId: row.category_id as string | null,
  }));
}
