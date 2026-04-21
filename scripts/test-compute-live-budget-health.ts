// scripts/test-compute-live-budget-health.ts

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { computeLiveBudgetHealth } from "../lib/budget-health/compute-live-budget-health";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const result = await computeLiveBudgetHealth({
    supabase,
    asOfDate: "2026-04-11",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});