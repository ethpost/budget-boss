import { SupabaseClient } from "@supabase/supabase-js";
import { TransactionUpsertRow } from "../domain/prepare-transaction-import";

export type UpsertTransactionsResult = {
  upsertedCount: number;
};

export async function upsertTransactions(
  supabase: SupabaseClient,
  rows: TransactionUpsertRow[]
): Promise<UpsertTransactionsResult> {
  if (rows.length === 0) {
    return { upsertedCount: 0 };
  }

  const { data, error } = await supabase
    .from("transactions")
    .upsert(rows, {
      onConflict: "user_id,source,source_transaction_id",
    })
    .select("id");

  if (error) {
    throw new Error(`Failed to upsert transactions: ${error.message}`);
  }

  return {
    upsertedCount: data?.length ?? rows.length,
  };
}
