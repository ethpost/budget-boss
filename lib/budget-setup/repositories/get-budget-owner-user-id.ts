import { SupabaseClient } from "@supabase/supabase-js";

export async function getBudgetOwnerUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("user_id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load budget owner user id: ${error.message}`);
  }

  const userId = data?.[0]?.user_id;
  return typeof userId === "string" && userId.trim().length > 0
    ? userId.trim()
    : null;
}
