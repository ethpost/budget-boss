import { SupabaseClient } from "@supabase/supabase-js";

export type ReplaceActiveCategoryBudgetRow = {
  userId: string;
  categoryId: string;
  monthlyBudget: number;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
};

type ReplaceActiveCategoryBudgetsParams = {
  supabase: SupabaseClient;
  userId: string;
  asOfDate: string;
  rows: ReplaceActiveCategoryBudgetRow[];
};

export async function replaceActiveCategoryBudgets({
  supabase,
  userId,
  asOfDate,
  rows,
}: ReplaceActiveCategoryBudgetsParams): Promise<{ insertedCount: number }> {
  const { error: deleteError } = await supabase
    .from("category_budget_periods")
    .delete()
    .eq("user_id", userId)
    .lte("effective_start_date", asOfDate)
    .or(`effective_end_date.is.null,effective_end_date.gte.${asOfDate}`);

  if (deleteError) {
    throw new Error(
      `Failed to clear active category budgets: ${deleteError.message}`
    );
  }

  if (rows.length === 0) {
    return { insertedCount: 0 };
  }

  const { error: insertError } = await supabase
    .from("category_budget_periods")
    .insert(
      rows.map((row) => ({
        user_id: row.userId,
        category_id: row.categoryId,
        monthly_budget: row.monthlyBudget,
        effective_start_date: row.effectiveStartDate,
        effective_end_date: row.effectiveEndDate,
      }))
    );

  if (insertError) {
    throw new Error(
      `Failed to save active category budgets: ${insertError.message}`
    );
  }

  return { insertedCount: rows.length };
}
