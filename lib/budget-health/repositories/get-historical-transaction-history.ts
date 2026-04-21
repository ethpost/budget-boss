import { SupabaseClient } from "@supabase/supabase-js";

export type HistoricalTransactionHistoryRow = {
  amount: number;
};

type GetHistoricalTransactionHistoryParams = {
  supabase: SupabaseClient;
  categoryId: string;
  lookbackWindowStartDate: string;
  lookbackWindowEndDate: string;
};

export async function getHistoricalTransactionHistory({
  supabase,
  categoryId,
  lookbackWindowStartDate,
  lookbackWindowEndDate,
}: GetHistoricalTransactionHistoryParams): Promise<
  HistoricalTransactionHistoryRow[]
> {
  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("category_id", categoryId)
    .gte("transaction_date", lookbackWindowStartDate)
    .lte("transaction_date", lookbackWindowEndDate);

  if (error) {
    throw new Error(
      `Failed to load historical transaction history: ${error.message}`
    );
  }

  return (data ?? []).map((row: any) => {
    return {
      amount: Number(row.amount ?? 0),
    };
  });
}
