import { NextResponse } from "next/server";
import { buildTrendBasedBudgetPlan } from "../../../../lib/budget-setup/domain/build-trend-based-budget-plan";
import { getActiveCategories } from "../../../../lib/budget-setup/repositories/get-active-categories";
import { getCategorizedTransactionHistory } from "../../../../lib/budget-setup/repositories/get-categorized-transaction-history";
import { replaceActiveCategoryBudgets } from "../../../../lib/budget-setup/repositories/replace-active-category-budgets";
import { getActualSpendToDateByCategory } from "../../../../lib/budget-health/repositories/get-actual-spend-to-date-by-category";
import { getPeriodContext } from "../../../../lib/budget-health/domain/get-period-context";
import { getHistoricalContextWindow } from "../../../../lib/budget-health/domain/get-historical-context-window";
import { getBudgetHealthAsOfDate } from "../../../../lib/budget-health/server/load-budget-health-dashboard";
import { requireRequestAuthSession } from "../../../../lib/auth/server-auth";

export async function POST(request: Request) {
  const authSession = await requireRequestAuthSession(request).catch(() => null);
  if (!authSession) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const asOfDate = getBudgetHealthAsOfDate();
  const period = getPeriodContext(asOfDate);
  const historicalWindow = getHistoricalContextWindow(asOfDate);
  const supabase = authSession.supabase;
  const userId = authSession.user.id;

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
