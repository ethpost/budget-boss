import { SupabaseClient } from "@supabase/supabase-js";

export type ActualSpendToDateRow = {
  categoryId: string;
  actualSpendToDate: number;
};

type GetActualSpendToDateByCategoryParams = {
  supabase: SupabaseClient;
  periodStartDate: string;
  asOfDate: string;
};

export async function getActualSpendToDateByCategory({
  supabase,
  periodStartDate,
  asOfDate,
}: GetActualSpendToDateByCategoryParams): Promise<ActualSpendToDateRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .gte("transaction_date", periodStartDate)
    .lte("transaction_date", asOfDate);

  if (error) {
    throw new Error(
      `Failed to load spend-to-date by category: ${error.message}`
    );
  }

  const totals = new Map<string, number>();

  for (const row of data ?? []) {
    const categoryId = row.category_id as string | null;
    const amount = Number(row.amount ?? 0);

    if (!categoryId) continue;
    if (!Number.isFinite(amount)) continue;

    totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount);
  }

  return Array.from(totals.entries())
    .map(([categoryId, actualSpendToDate]) => ({
      categoryId,
      actualSpendToDate,
    }))
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId));
}