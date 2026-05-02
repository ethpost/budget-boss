import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { computeLiveBudgetHealth } from "../compute-live-budget-health";

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  const year = map.get("year");
  const month = map.get("month");
  const day = map.get("day");

  if (!year || !month || !day) {
    throw new Error("Failed to format the current date.");
  }

  return `${year}-${month}-${day}`;
}

export function getBudgetHealthAsOfDate(): string {
  return formatDateInTimeZone(new Date(), "America/Chicago");
}

export type BudgetHealthDashboardState =
  | {
      status: "ready";
      asOfDate: string;
      result: Awaited<ReturnType<typeof computeLiveBudgetHealth>>;
    }
  | {
      status: "missing-config";
      asOfDate: string;
      message: string;
    }
  | {
      status: "error";
      asOfDate: string;
      message: string;
    };

export async function loadBudgetHealthDashboard(
  authenticatedSupabase?: SupabaseClient
): Promise<BudgetHealthDashboardState> {
  const asOfDate = getBudgetHealthAsOfDate();
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!authenticatedSupabase && (!supabaseUrl || !supabaseKey)) {
    return {
      status: "missing-config",
      asOfDate,
      message:
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load live budget health.",
    };
  }

  const supabase =
    authenticatedSupabase ?? createClient(supabaseUrl as string, supabaseKey as string);

  try {
    const result = await computeLiveBudgetHealth({ supabase, asOfDate });
    return {
      status: "ready",
      asOfDate,
      result,
    };
  } catch (error) {
    return {
      status: "error",
      asOfDate,
      message:
        error instanceof Error ? error.message : "Failed to load budget health.",
    };
  }
}
