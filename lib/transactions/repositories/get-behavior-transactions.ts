import { SupabaseClient } from "@supabase/supabase-js";

export type BehaviorTransactionRow = {
  transactionDate: string;
  amount: number;
  merchantName: string | null;
  description: string | null;
  categoryId: string | null;
};

export async function getBehaviorTransactions(params: {
  supabase: SupabaseClient;
  userId: string;
  startDate: string;
  endDate: string;
  source?: string;
  limit?: number;
}): Promise<BehaviorTransactionRow[]> {
  const { data, error } = await params.supabase
    .from("transactions")
    .select("transaction_date, amount, merchant_name, description, category_id")
    .eq("user_id", params.userId)
    .eq("source", params.source ?? "plaid")
    .gte("transaction_date", params.startDate)
    .lte("transaction_date", params.endDate)
    .order("transaction_date", { ascending: false })
    .limit(params.limit ?? 1000);

  if (error) {
    throw new Error(`Failed to load behavior transactions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    transactionDate: String(row.transaction_date),
    amount: Number(row.amount ?? 0),
    merchantName: row.merchant_name as string | null,
    description: row.description as string | null,
    categoryId: row.category_id as string | null,
  }));
}
