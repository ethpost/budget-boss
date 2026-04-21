import { SupabaseClient } from "@supabase/supabase-js";

export type CategorizedTransactionHistoryRow = {
  categoryId: string;
  amount: number;
  transactionDate: string;
};

type GetCategorizedTransactionHistoryParams = {
  supabase: SupabaseClient;
  userId: string;
  lookbackWindowStartDate: string;
  lookbackWindowEndDate: string;
};

export async function getCategorizedTransactionHistory({
  supabase,
  userId,
  lookbackWindowStartDate,
  lookbackWindowEndDate,
}: GetCategorizedTransactionHistoryParams): Promise<
  CategorizedTransactionHistoryRow[]
> {
  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, amount, transaction_date")
    .eq("user_id", userId)
    .gte("transaction_date", lookbackWindowStartDate)
    .lte("transaction_date", lookbackWindowEndDate)
    .not("category_id", "is", null);

  if (error) {
    throw new Error(
      `Failed to load categorized transaction history: ${error.message}`
    );
  }

  return (data ?? []).map((row: any) => ({
    categoryId: String(row.category_id ?? ""),
    amount: Number(row.amount ?? 0),
    transactionDate: String(row.transaction_date ?? ""),
  }));
}
