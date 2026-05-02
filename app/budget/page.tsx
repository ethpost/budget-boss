import Link from "next/link";
import { LogoutButton } from "../components/logout-button";
import { buildTrendBasedBudgetPlan } from "../../lib/budget-setup/domain/build-trend-based-budget-plan";
import { getActiveCategories } from "../../lib/budget-setup/repositories/get-active-categories";
import { getCategorizedTransactionHistory } from "../../lib/budget-setup/repositories/get-categorized-transaction-history";
import { getActiveCategoryBudgets } from "../../lib/budget-health/repositories/get-active-category-budgets";
import { getActualSpendToDateByCategory } from "../../lib/budget-health/repositories/get-actual-spend-to-date-by-category";
import { getPeriodContext } from "../../lib/budget-health/domain/get-period-context";
import { getHistoricalContextWindow } from "../../lib/budget-health/domain/get-historical-context-window";
import { getBudgetHealthAsOfDate } from "../../lib/budget-health/server/load-budget-health-dashboard";
import { requirePageAuthSession } from "../../lib/auth/server-auth";

export const dynamic = "force-dynamic";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams?: Promise<{
    saved?: string | string[];
    error?: string | string[];
  }>;
}) {
  const authSession = await requirePageAuthSession("/budget");
  const asOfDate = getBudgetHealthAsOfDate();
  const period = getPeriodContext(asOfDate);
  const historicalWindow = getHistoricalContextWindow(asOfDate);
  const plaidConfigured =
    Boolean(process.env.PLAID_CLIENT_ID) && Boolean(process.env.PLAID_SECRET);

  const searchParamsValue = (await searchParams) ?? {};
  const saved = searchParamsValue.saved === "1";
  const error = searchParamsValue.error === "1";

  const supabase = authSession.supabase;
  const budgetOwnerUserId = authSession.user.id;

  const [activeCategories, historicalRows, currentBudgets, currentMonthSpendRows] =
    await Promise.all([
      getActiveCategories(supabase, budgetOwnerUserId),
      getCategorizedTransactionHistory({
        supabase,
        userId: budgetOwnerUserId,
        lookbackWindowStartDate: historicalWindow.lookbackWindowStartDate,
        lookbackWindowEndDate: asOfDate,
      }).catch(() => []),
      getActiveCategoryBudgets(supabase, asOfDate).catch(() => []),
      getActualSpendToDateByCategory({
        supabase,
        periodStartDate: period.periodStartDate,
        asOfDate,
      }).catch(() => []),
    ]);

  const currentBudgetByCategoryId = new Map(
    currentBudgets.map((row) => [row.categoryId, row.plannedBudgetAmount])
  );
  const currentMonthSpendByCategoryId = new Map(
    currentMonthSpendRows.map((row) => [row.categoryId, row.actualSpendToDate])
  );
  const trendPlan = buildTrendBasedBudgetPlan({
    activeCategories,
    recentTransactions: historicalRows,
    lookbackDays: historicalWindow.lookbackWindowDays,
    currentMonthSpendByCategoryId,
  });

  return (
    <main className="screen">
      <header className="shellHeader">
        <div className="shellBrand">
          <div className="shellMark">BB</div>
          <div>
            <p className="shellKicker">Budget Boss</p>
            <p className="shellTitle">Budget setup</p>
          </div>
        </div>
        <div className="shellActions">
          <Link className="shellLink" href="/">
            Back to budget health
          </Link>
          <Link className="shellLink" href="/settings">
            Connections
          </Link>
          <Link className="shellLink" href="/chat">
            Chat
          </Link>
          <Link className="shellLink" href="/transactions">
            Review
          </Link>
          <LogoutButton />
          <div className="shellPill">Trend-based monthly plan</div>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">Budget setup</div>
        <h1 className="title">Build the month from real spending trends.</h1>
        <p className="lede">
          This creates static monthly budget values. The initial numbers are informed
          by recent categorized spending, then floored at current month spend so the
          plan stays grounded in actual activity.
        </p>
        <div className="metaRow">
          <span className="chip">As of {asOfDate}</span>
          <span className="chip">Current period {period.periodStartDate} → {period.periodEndDate}</span>
          <span className="chip">Current user {budgetOwnerUserId}</span>
          <span className="chip">{plaidConfigured ? "Plaid connected" : "Plaid setup needed"}</span>
        </div>
        <div className="metricRow">
          <div className="metricCard">
            <p className="label">Categories</p>
            <p className="value">{trendPlan.categories.length}</p>
            <p className="subvalue">Active categories with proposed monthly budgets</p>
          </div>
          <div className="metricCard">
            <p className="label">Current total</p>
            <p className="value">
              {formatCurrency(
                currentBudgets.reduce((sum, row) => sum + row.plannedBudgetAmount, 0)
              )}
            </p>
            <p className="subvalue">Existing active monthly plan</p>
          </div>
          <div className="metricCard">
            <p className="label">Proposed total</p>
            <p className="value">{formatCurrency(trendPlan.totalSuggestedBudget)}</p>
            <p className="subvalue">Trend-based plan from recent transactions</p>
          </div>
          <div className="metricCard">
            <p className="label">Recent spend</p>
            <p className="value">{formatCurrency(trendPlan.totalRecentSpend)}</p>
            <p className="subvalue">Categorized spend in the last 90 days</p>
          </div>
        </div>
        {saved ? <p className="tiny">Saved the initial monthly budget plan.</p> : null}
        {error ? (
          <p className="tiny">There was a problem saving the budget plan.</p>
        ) : null}
      </section>

      <div className="workspace workspace--single">
        <article className="panel">
          <div className="sectionHeader">
            <p className="sectionTitle">Category plan</p>
            <form action="/api/budget/setup" method="post">
              <button type="submit" className="primaryButton">
                Save initial budget plan
              </button>
            </form>
          </div>
          <div className="section">
            <ul className="list">
              {trendPlan.categories.map((category) => {
                const currentMonthlyBudget =
                  currentBudgetByCategoryId.get(category.categoryId) ?? 0;
                const delta = category.suggestedMonthlyBudget - currentMonthlyBudget;

                return (
                  <li key={category.categoryId} className="listItem">
                    <div>
                      <p className="listItemName">{category.categoryName}</p>
                      <p className="listItemMeta">
                        {category.categoryBehaviorType} · {category.budgetBasis}
                      </p>
                    </div>
                    <div className="auditStack">
                      <p className="amount amount--plan">
                        {formatCurrency(category.suggestedMonthlyBudget)}
                      </p>
                      <p className="tiny">
                        Current {formatCurrency(currentMonthlyBudget)} · Delta{" "}
                        {delta >= 0 ? "+" : ""}
                        {formatCurrency(delta)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </article>
      </div>
    </main>
  );
}
