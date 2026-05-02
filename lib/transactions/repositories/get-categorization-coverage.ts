import { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCategorizationCoverage,
  CategorizationCoverage,
} from "../domain/build-categorization-coverage";

export async function getCategorizationCoverage(params: {
  supabase: SupabaseClient;
  userId: string;
  periodStartDate: string;
  asOfDate: string;
  source?: string;
}): Promise<CategorizationCoverage> {
  const { data, error } = await params.supabase
    .from("transactions")
    .select("amount, category_id")
    .eq("user_id", params.userId)
    .eq("source", params.source ?? "plaid")
    .gte("transaction_date", params.periodStartDate)
    .lte("transaction_date", params.asOfDate);

  if (error) {
    throw new Error(
      `Failed to load categorization coverage: ${error.message}`
    );
  }

  return buildCategorizationCoverage(
    (data ?? []).map((row: any) => ({
      amount: Number(row.amount ?? 0),
      categoryId: row.category_id as string | null,
    }))
  );
}
