import { SupabaseClient } from "@supabase/supabase-js";
import {
  buildUncategorizedTransactionGroups,
  UncategorizedTransactionGroup,
  UncategorizedTransactionRow,
} from "../domain/build-uncategorized-transaction-groups";

export async function getUncategorizedTransactionGroups(params: {
  supabase: SupabaseClient;
  userId: string;
  source?: string;
  limit?: number;
}): Promise<UncategorizedTransactionGroup[]> {
  const { data, error } = await params.supabase
    .from("transactions")
    .select("source_transaction_id, transaction_date, amount, merchant_name, description")
    .eq("user_id", params.userId)
    .eq("source", params.source ?? "plaid")
    .is("category_id", null)
    .order("transaction_date", { ascending: false })
    .limit(params.limit ?? 100);

  if (error) {
    throw new Error(
      `Failed to load uncategorized transaction groups: ${error.message}`
    );
  }

  const rows: UncategorizedTransactionRow[] = (data ?? []).map((row: any) => ({
    sourceTransactionId: String(row.source_transaction_id ?? ""),
    transactionDate: String(row.transaction_date ?? ""),
    amount: Number(row.amount ?? 0),
    merchantName: row.merchant_name as string | null,
    description: row.description as string | null,
  }));

  return buildUncategorizedTransactionGroups(rows);
}
