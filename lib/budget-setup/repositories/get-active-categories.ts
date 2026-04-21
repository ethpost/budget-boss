import { SupabaseClient } from "@supabase/supabase-js";
import { CategoryBehaviorType } from "../../budget-health/repositories/get-active-category-budgets";

export type ActiveCategoryRow = {
  categoryId: string;
  categoryName: string;
  categoryBehaviorType: CategoryBehaviorType;
};

export async function getActiveCategories(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveCategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, behavior_type")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load active categories: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    categoryId: String(row.id ?? ""),
    categoryName: String(row.name ?? ""),
    categoryBehaviorType: row.behavior_type as CategoryBehaviorType,
  }));
}
