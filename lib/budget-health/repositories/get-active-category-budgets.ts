import { SupabaseClient } from "@supabase/supabase-js";

export type CategoryBehaviorType = "fixed" | "variable" | "discretionary";

export type ActiveCategoryBudgetRow = {
  categoryId: string;
  categoryName: string;
  categoryBehaviorType: CategoryBehaviorType;
  plannedBudgetAmount: number;
};

export async function getActiveCategoryBudgets(
  supabase: SupabaseClient,
  asOfDate: string
): Promise<ActiveCategoryBudgetRow[]> {
  const { data, error } = await supabase
    .from("category_budget_periods")
    .select(
      `
      category_id,
      monthly_budget,
      categories!inner (
        id,
        name,
        behavior_type
      )
    `
    )
    .lte("effective_start_date", asOfDate)
    .or(`effective_end_date.is.null,effective_end_date.gte.${asOfDate}`);

  if (error) {
    throw new Error(`Failed to load active category budgets: ${error.message}`);
  }

  return (data ?? []).map((row: any) => {
    const category = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories;

    if (!category) {
      throw new Error(
        `Missing joined category for category_id ${row.category_id}`
      );
    }

    return {
      categoryId: row.category_id,
      categoryName: category.name,
      categoryBehaviorType: category.behavior_type,
      plannedBudgetAmount: Number(row.monthly_budget ?? 0),
    };
  });
}