import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildTrendBasedBudgetPlan } from "../../../../lib/budget-setup/domain/build-trend-based-budget-plan";
import { getActiveCategories } from "../../../../lib/budget-setup/repositories/get-active-categories";
import { getCategorizedTransactionHistory } from "../../../../lib/budget-setup/repositories/get-categorized-transaction-history";
import { getBudgetOwnerUserId } from "../../../../lib/budget-setup/repositories/get-budget-owner-user-id";
import { replaceActiveCategoryBudgets } from "../../../../lib/budget-setup/repositories/replace-active-category-budgets";
import { getActualSpendToDateByCategory } from "../../../../lib/budget-health/repositories/get-actual-spend-to-date-by-category";
import { getPeriodContext } from "../../../../lib/budget-health/domain/get-period-context";
import { getHistoricalContextWindow } from "../../../../lib/budget-health/domain/get-historical-context-window";
import { getBudgetHealthAsOfDate } from "../../../../lib/budget-health/server/load-budget-health-dashboard";

export async function POST(request: Request) {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/budget?error=1", process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3001"));
  }

  const asOfDate = getBudgetHealthAsOfDate();
  const period = getPeriodContext(asOfDate);
  const historicalWindow = getHistoricalContextWindow(asOfDate);
  const supabase = createClient(supabaseUrl, supabaseKey);
  const userId = await getBudgetOwnerUserId(supabase);

  if (!userId) {
    return NextResponse.redirect(new URL("/budget?error=1", request.url));
  }

  try {
    const [activeCategories, historicalRows, currentMonthSpendRows] = await Promise.all([
      getActiveCategories(supabase, userId),
      getCategorizedTransactionHistory({
        supabase,
        userId,
        lookbackWindowStartDate: historicalWindow.lookbackWindowStartDate,
        lookbackWindowEndDate: historicalWindow.lookbackWindowEndDate,
      }),
      getActualSpendToDateByCategory({
        supabase,
        periodStartDate: period.periodStartDate,
        asOfDate,
      }),
    ]);

    const currentMonthSpendMap = new Map(
      currentMonthSpendRows.map((row) => [row.categoryId, row.actualSpendToDate])
    );
    const plan = buildTrendBasedBudgetPlan({
      activeCategories,
      recentTransactions: historicalRows,
      lookbackDays: 90,
      currentMonthSpendByCategoryId: currentMonthSpendMap,
    });

    await replaceActiveCategoryBudgets({
      supabase,
      userId,
      asOfDate,
      rows: plan.categories.map((category) => ({
        userId,
        categoryId: category.categoryId,
        monthlyBudget: category.suggestedMonthlyBudget,
        effectiveStartDate: period.periodStartDate,
        effectiveEndDate: null,
      })),
    });

    return NextResponse.redirect(new URL("/budget?saved=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/budget?error=1", request.url));
  }
}
