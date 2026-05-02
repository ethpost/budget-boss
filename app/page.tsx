import Link from "next/link";
import type { CSSProperties } from "react";
import { LogoutButton } from "./components/logout-button";
import { requirePageAuthSession } from "../lib/auth/server-auth";
import { buildOperatingCenterSummary } from "../lib/budget-health/domain/build-operating-center-summary";
import { loadBudgetHealthDashboard } from "../lib/budget-health/server/load-budget-health-dashboard";
import { buildTransactionImportAudit } from "../lib/transactions/domain/build-transaction-import-audit";
import { getCategorizationCoverage } from "../lib/transactions/repositories/get-categorization-coverage";
import { getRecentTransactions } from "../lib/transactions/repositories/get-recent-transactions";
import { getUncategorizedTransactionGroups } from "../lib/transactions/repositories/get-uncategorized-transaction-groups";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    category?: string | string[];
  }>;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function formatScore(value: number): string {
  return value >= 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
}

function directionLabel(direction: string): string {
  switch (direction) {
    case "over_budget":
      return "Over budget";
    case "under_budget":
      return "Under budget";
    default:
      return "On plan";
  }
}

function confidenceLabel(confidence: string): string {
  return confidence[0].toUpperCase() + confidence.slice(1);
}

function displayCategoryAmount(amount: number): string {
  return amount > 0
    ? `Over ${formatCurrency(amount)}`
    : `Under ${formatCurrency(Math.abs(amount))}`;
}

function formatReadableTimestamp(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

function formatBehaviorType(behaviorType: string): string {
  switch (behaviorType) {
    case "fixed":
      return "Fixed";
    case "discretionary":
      return "Discretionary";
    default:
      return "Variable";
  }
}

function normalizeSearchParam(value?: string | string[]): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value && value.length > 0 ? value : null;
}

function getSelectedCategoryId(params: {
  searchParams?: {
    category?: string | string[];
  };
  primaryDriverCategoryId: string | null;
  categories: Array<{ categoryId: string }>;
}): string | null {
  const requestedCategoryId = normalizeSearchParam(params.searchParams?.category);
  if (requestedCategoryId) {
    const found = params.categories.some(
      (category) => category.categoryId === requestedCategoryId
    );
    if (found) return requestedCategoryId;
  }

  return params.primaryDriverCategoryId ?? params.categories[0]?.categoryId ?? null;
}

function getCategoryHref(categoryId: string): string {
  return `/?category=${encodeURIComponent(categoryId)}`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatCoveragePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatMonthProgressLabel(daysElapsed: number, totalDaysInPeriod: number): string {
  return `${Math.round((daysElapsed / Math.max(1, totalDaysInPeriod)) * 100)}% through month`;
}

function buildCategoryPaceNote(params: {
  categoryBehaviorType: string;
  actualSpendToDate: number;
  plannedBudgetAmount: number;
  projectedVarianceAmount: number;
}): string {
  const { categoryBehaviorType, actualSpendToDate, plannedBudgetAmount, projectedVarianceAmount } =
    params;

  const behaviorLabel = formatBehaviorType(categoryBehaviorType).toLowerCase();

  if (categoryBehaviorType === "fixed") {
    return `This fixed category is modeled with a remaining-spend rule. It has ${formatCurrency(
      actualSpendToDate
    )} spent against ${formatCurrency(plannedBudgetAmount)} planned.`;
  }

  const paceLabel = projectedVarianceAmount >= 0 ? "is running above pace" : "is pacing below plan";
  return `This ${behaviorLabel} category ${paceLabel} with ${formatCurrency(
    actualSpendToDate
  )} spent against ${formatCurrency(plannedBudgetAmount)} planned.`;
}

function buildCategoryDetailSubtitle(params: {
  categoryBehaviorType: string;
  selectedCategoryIsPrimaryDriver: boolean;
  driverSummary: string | null;
  historicalSummary: string | null;
}): string {
  const { categoryBehaviorType, selectedCategoryIsPrimaryDriver, driverSummary, historicalSummary } =
    params;

  const behaviorPrefix =
    categoryBehaviorType === "fixed"
      ? "Fixed categories stay close to their planned amount."
      : categoryBehaviorType === "discretionary"
        ? "Discretionary categories can swing more with day-to-day decisions."
        : "Variable categories usually follow the current pace of spend.";

  if (selectedCategoryIsPrimaryDriver) {
    const pieces = [behaviorPrefix];
    if (driverSummary) pieces.push(driverSummary);
    if (historicalSummary) pieces.push(historicalSummary);
    return pieces.join(" ");
  }

  return `${behaviorPrefix} Focused historical context appears when this category becomes the primary driver.`;
}

function buildCategoryDetailInsight(params: {
  categoryBehaviorType: string;
  selectedCategoryIsPrimaryDriver: boolean;
  projectedVarianceAmount: number;
  driverSignal: {
    label: string;
    value: string;
  } | null;
  historicalContext: {
    isAvailable: boolean;
    transactionCount: number;
  } | null;
}): Array<{ label: string; value: string }> {
  const {
    categoryBehaviorType,
    selectedCategoryIsPrimaryDriver,
    projectedVarianceAmount,
    driverSignal,
    historicalContext,
  } = params;

  const pacingValue =
    projectedVarianceAmount > 0
      ? "Running above plan"
      : projectedVarianceAmount < 0
        ? "Running below plan"
        : "On plan";

  const historyValue =
    selectedCategoryIsPrimaryDriver && historicalContext?.isAvailable
      ? historicalContext.transactionCount === 1
        ? "1 comparable transaction"
        : `${historicalContext.transactionCount} comparable transactions`
      : "Primary-driver history only";

  const insights = [
    {
      label: "Pacing",
      value:
        categoryBehaviorType === "fixed"
          ? "Modeled as fixed"
          : pacingValue,
    },
    {
      label: "History",
      value: historyValue,
    },
    {
      label: "Focus",
      value: selectedCategoryIsPrimaryDriver ? "Primary driver" : "Reference only",
    },
  ];

  if (selectedCategoryIsPrimaryDriver && driverSignal) {
    insights.push({
      label: driverSignal.label,
      value: driverSignal.value,
    });
  }

  return insights;
}

function buildCategoryDetailSummary(params: {
  categoryBehaviorType: string;
  selectedCategoryIsPrimaryDriver: boolean;
  driverSummary: string | null;
  historicalSummary: string | null;
  actualSpendToDate: number;
  plannedBudgetAmount: number;
  projectedFinalSpend: number;
  projectedVarianceAmount: number;
}): {
  subtitle: string;
  progressPercent: number;
  projectedPercent: number;
  remainingAmount: number;
} {
  const {
    categoryBehaviorType,
    selectedCategoryIsPrimaryDriver,
    driverSummary,
    historicalSummary,
    actualSpendToDate,
    plannedBudgetAmount,
    projectedFinalSpend,
    projectedVarianceAmount,
  } = params;

  const subtitle = buildCategoryDetailSubtitle({
    categoryBehaviorType,
    selectedCategoryIsPrimaryDriver,
    driverSummary,
    historicalSummary,
  });

  const safePlanned = Math.max(1, plannedBudgetAmount);
  const progressPercent = clampPercent((actualSpendToDate / safePlanned) * 100);
  const projectedPercent = clampPercent((projectedFinalSpend / safePlanned) * 100);
  const remainingAmount = Math.max(plannedBudgetAmount - actualSpendToDate, 0);

  return {
    subtitle,
    progressPercent,
    projectedPercent,
    remainingAmount,
  };
}

export default async function Page({ searchParams }: PageProps) {
  const authSession = await requirePageAuthSession("/");
  const resolvedSearchParams = (await searchParams) ?? {};
  const state = await loadBudgetHealthDashboard(authSession.supabase);

  if (state.status !== "ready") {
    return (
      <main className="screen">
        <header className="shellHeader">
          <div className="shellBrand">
            <div className="shellMark">BB</div>
            <div>
              <p className="shellKicker">Budget Boss</p>
              <p className="shellTitle">Live budget health</p>
            </div>
          </div>
          <div className="shellPill">Deterministic explanation layer</div>
        </header>

        <div className="workspace workspace--single">
          <section className="hero">
            <div className="eyebrow">Budget Health</div>
            <h1 className="title">Budget Boss</h1>
            <p className="lede">
              The product shell is live. Connect Supabase to see your month’s pacing,
              projected outcome, and explanation layer.
            </p>

            <p className="tiny">
              Last refreshed: {formatReadableTimestamp(new Date().toISOString())}
            </p>

            <div className="grid2">
              <article className="panel notice">
                <p className="label">Connection</p>
                <p className="value">
                  {state.status === "missing-config" ? "Setup needed" : "Unable to load"}
                </p>
                <p className="subvalue">{state.message}</p>
                <div className="section">
                  <p className="sectionTitle">What to add</p>
                  <ul className="checklist">
                    <li>SUPABASE_URL</li>
                    <li>SUPABASE_SERVICE_ROLE_KEY</li>
                    <li>Restart the dev server after updating .env</li>
                  </ul>
                </div>
              </article>

              <article className="panel">
                <p className="label">What you’ll see</p>
                <p className="value">Budget health, explained</p>
                <p className="subvalue">
                  Summary, driverSummary, historicalSummary, confidence, and top category
                  drivers all appear on one mobile-friendly screen.
                </p>
                <div className="section">
                  <p className="sectionTitle">Current date</p>
                  <p className="value">{state.asOfDate}</p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { result, asOfDate } = state;
  const { explanation, totals, categories, period } = result;
  const [categorizationCoverage, reviewGroups, recentPlaidTransactions] =
    await Promise.all([
      getCategorizationCoverage({
        supabase: authSession.supabase,
        userId: authSession.user.id,
        periodStartDate: period.periodStartDate,
        asOfDate,
        source: "plaid",
      }).catch(() => null),
      getUncategorizedTransactionGroups({
        supabase: authSession.supabase,
        userId: authSession.user.id,
        source: "plaid",
        limit: 100,
      }).catch(() => []),
      getRecentTransactions({
        supabase: authSession.supabase,
        userId: authSession.user.id,
        source: "plaid",
        limit: 20,
      }).catch(() => []),
    ]);
  const recentImportAudit = buildTransactionImportAudit(recentPlaidTransactions);
  const reviewTransactionCount = reviewGroups.reduce(
    (sum, group) => sum + group.transactionCount,
    0
  );
  const operatingSummary = buildOperatingCenterSummary({
    projectedMonthEndVariance: totals.projectedMonthEndVariance,
    categorizedSpendCoverageRatio:
      categorizationCoverage?.categorizedSpendCoverageRatio ?? 0,
    uncategorizedTransactionCount:
      categorizationCoverage?.uncategorizedTransactionCount ?? reviewTransactionCount,
    reviewGroupCount: reviewGroups.length,
  });
  const selectedCategoryId = getSelectedCategoryId({
    searchParams: resolvedSearchParams,
    primaryDriverCategoryId: explanation.primaryDriverCategoryId,
    categories,
  });
  const selectedCategory = categories.find(
    (category) => category.categoryId === selectedCategoryId
  );
  const primaryDriverCategory = categories.find(
    (category) => category.categoryId === explanation.primaryDriverCategoryId
  );
  const selectedCategoryIsPrimaryDriver =
    selectedCategory?.categoryId === explanation.primaryDriverCategoryId;

  const selectedCategoryDetail = selectedCategory
    ? buildCategoryDetailSummary({
        categoryBehaviorType: selectedCategory.categoryBehaviorType,
        selectedCategoryIsPrimaryDriver,
        driverSummary: selectedCategoryIsPrimaryDriver ? explanation.driverSummary : null,
        historicalSummary: selectedCategoryIsPrimaryDriver ? explanation.historicalSummary : null,
        actualSpendToDate: selectedCategory.actualSpendToDate,
        plannedBudgetAmount: selectedCategory.plannedBudgetAmount,
        projectedFinalSpend:
          selectedCategory.plannedBudgetAmount +
          selectedCategory.projectedVarianceAmount,
        projectedVarianceAmount: selectedCategory.projectedVarianceAmount,
      })
    : null;

  const selectedCategoryInsights = selectedCategory
    ? buildCategoryDetailInsight({
        categoryBehaviorType: selectedCategory.categoryBehaviorType,
        selectedCategoryIsPrimaryDriver,
        projectedVarianceAmount: selectedCategory.projectedVarianceAmount,
        driverSignal:
          selectedCategoryIsPrimaryDriver && explanation.driverSignal
            ? explanation.driverSignal
            : null,
        historicalContext:
          selectedCategoryIsPrimaryDriver && explanation.historicalContext
            ? {
                isAvailable: explanation.historicalContext.isAvailable,
                transactionCount: explanation.historicalContext.transactionCount,
              }
            : null,
      })
    : [];

  const monthProgressPercent = clampPercent(
    (period.daysElapsed / Math.max(1, period.totalDaysInPeriod)) * 100
  );

  return (
    <main className="screen">
      <header className="shellHeader">
        <div className="shellBrand">
          <div className="shellMark">BB</div>
          <div>
            <p className="shellKicker">Budget Boss</p>
            <p className="shellTitle">Live budget health</p>
          </div>
        </div>
        <div className="shellActions">
          <Link className="shellLink" href="/budget">
            Budgets
          </Link>
          <Link className="shellLink" href="/chat">
            Chat
          </Link>
          <Link className="shellLink" href="/transactions">
            Review
          </Link>
          <Link className="shellLink" href="/settings">
            Connections
          </Link>
          <LogoutButton />
          <div className="shellPill">
            Last updated {formatReadableTimestamp(result.meta.computedAt)}
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="rail">
          <section className="railPanel">
            <div className="railSectionHeader">
              <p className="sectionTitle">This month</p>
              <span className={`chip chip--${explanation.direction}`}>
                {directionLabel(explanation.direction)}
              </span>
            </div>

            <div className="railMetric">
              <p className="railMetricValue">{formatScore(totals.budgetHealthScore)}</p>
              <p className="railMetricLabel">Budget Health Score</p>
            </div>

            <div className="railStatGrid">
              <div className="railStat">
                <p className="railStatLabel">Confidence</p>
                <p className="railStatValue">{confidenceLabel(explanation.confidence)}</p>
              </div>
              <div className="railStat">
                <p className="railStatLabel">Variance</p>
                <p className="railStatValue">
                  {formatSignedCurrency(totals.projectedMonthEndVariance)}
                </p>
              </div>
            </div>

            <div className="railNote">
              <div className="railNoteLine">
                <span>As of {asOfDate}</span>
                <span className="railNoteLabel">
                  {formatMonthProgressLabel(period.daysElapsed, period.totalDaysInPeriod)}
                </span>
              </div>
              <div className="railProgress" aria-label="Month progress">
                <span
                  className="railProgressFill"
                  style={{ width: `${monthProgressPercent}%` }}
                />
                <span
                  className="railProgressMarker"
                  style={{ left: `${monthProgressPercent}%` }}
                />
              </div>
            </div>
          </section>

          <section className="railPanel">
            <div className="railSectionHeader">
              <p className="sectionTitle">Categories</p>
              <span className="tiny">{categories.length} active</span>
            </div>

            <div className="railLinkList">
              {categories.map((category) => {
                const isActive = category.categoryId === selectedCategoryId;

                return (
                  <Link
                    key={category.categoryId}
                    href={getCategoryHref(category.categoryId)}
                    className={`railLink ${isActive ? "railLink--active" : ""}`}
                  >
                    <div>
                      <p className="railLinkName">{category.categoryName}</p>
                      <p className="railLinkMeta">
                        {formatBehaviorType(category.categoryBehaviorType)} · Planned{" "}
                        {formatCurrency(category.plannedBudgetAmount)}
                      </p>
                    </div>
                    <span
                      className={`railLinkAmount ${
                        category.projectedVarianceAmount > 0
                          ? "amount--over"
                          : "amount--under"
                      }`}
                    >
                      {formatSignedCurrency(category.projectedVarianceAmount)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="content">
          <section className="hero">
            <div className="eyebrow">Budget Health</div>
            <h1 className="title">Your month, at a glance.</h1>
            <p className="lede">{explanation.summary}</p>

            <div className="metaRow">
              <span className={`chip chip--${explanation.direction}`}>
                {directionLabel(explanation.direction)}
              </span>
              <span className={`chip chip--${explanation.confidence}`}>
                Confidence: {confidenceLabel(explanation.confidence)}
              </span>
              <span className="chip">
                Operating status: {operatingSummary.status.replace("_", " ")}
              </span>
              <span className="chip">As of {asOfDate}</span>
              <span className="chip">
                Day {period.daysElapsed} of {period.totalDaysInPeriod}
              </span>
            </div>

            <div className="grid2">
              <article className="panel panel--accent">
                <p className="label">Operating center</p>
                <p className="value">{operatingSummary.nextActionLabel}</p>
                <p className="subvalue">{operatingSummary.headline}</p>
                <div className="plaidPanelActions">
                  <Link
                    className="primaryButton primaryButton--link"
                    href={
                      operatingSummary.status === "needs_review"
                        ? "/transactions"
                        : explanation.primaryDriverCategoryId
                          ? getCategoryHref(explanation.primaryDriverCategoryId)
                          : "/settings"
                    }
                  >
                    {operatingSummary.status === "needs_review"
                      ? "Open review"
                      : operatingSummary.status === "watch"
                        ? "Inspect driver"
                        : "Check syncs"}
                  </Link>
                  <span className="plaidStatus">{operatingSummary.coverageLabel}</span>
                </div>
              </article>

              <article className="panel">
                <p className="label">Automation queue</p>
                <p className="value">
                  {reviewGroups.length} group{reviewGroups.length === 1 ? "" : "s"}
                </p>
                <p className="subvalue">
                  {reviewTransactionCount} transaction
                  {reviewTransactionCount === 1 ? "" : "s"} need categorization review.
                </p>
                <div className="metricRow metricRow--compact">
                  <div className="miniMetric">
                    <p className="label">Spend covered</p>
                    <p className="value">
                      {categorizationCoverage
                        ? formatCoveragePercent(
                            categorizationCoverage.categorizedSpendCoverageRatio
                          )
                        : "0%"}
                    </p>
                    <p className="subvalue">Current-month Plaid coverage</p>
                  </div>
                  <div className="miniMetric">
                    <p className="label">Uncategorized</p>
                    <p className="value">
                      {categorizationCoverage
                        ? formatCurrency(categorizationCoverage.uncategorizedSpendAmount)
                        : formatCurrency(0)}
                    </p>
                    <p className="subvalue">Current-month spend not counted by category</p>
                  </div>
                </div>
              </article>
            </div>

            <div className="panelGrid">
              <article className="panel panel--accent">
                <p className="label">Budget Health Score</p>
                <p className="value">{formatScore(totals.budgetHealthScore)}</p>
                <p className="subvalue">
                  Negative means under plan, zero means on plan, positive means over plan.
                </p>
              </article>

              <article className="panel">
                <p className="label">Projected variance</p>
                <p className="value">
                  {formatSignedCurrency(totals.projectedMonthEndVariance)}
                </p>
                <p className="subvalue">
                  Projected month-end impact across all active categories.
                </p>
              </article>

              <article className="panel">
                <p className="label">Planned budget</p>
                <p className="value">{formatCurrency(totals.plannedBudgetAmount)}</p>
                <p className="subvalue">Total active budget for the current period.</p>
              </article>

              <article className="panel">
                <p className="label">Actual spend</p>
                <p className="value">{formatCurrency(totals.actualSpendToDate)}</p>
                <p className="subvalue">Spend captured so far in the current period.</p>
              </article>
            </div>

            <div className="stack">
              <article className="panel">
                <p className="label">Recent Plaid sync</p>
                <p className="value">{recentImportAudit.transactionCount} recent rows</p>
                <p className="subvalue">
                  {recentImportAudit.categorizedTransactionCount} categorized ·{" "}
                  {recentImportAudit.uncategorizedTransactionCount} uncategorized ·{" "}
                  {formatCurrency(recentImportAudit.totalAmount)} total in the latest sample.
                </p>
                <div className="plaidPanelActions">
                  <Link className="primaryButton primaryButton--link" href="/settings">
                    Manage connection
                  </Link>
                  <Link className="shellLink" href="/transactions">
                    Review exceptions
                  </Link>
                </div>
              </article>

              <article className="panel plaidPanel">
                <p className="label">Chat</p>
                <p className="value">Ask the budget</p>
                <p className="subvalue">
                  The chat surface is now separate from budget health. It stays grounded
                  in the same deterministic explanation layer.
                </p>
                <div className="plaidPanelActions">
                  <Link className="primaryButton primaryButton--link" href="/chat">
                    Open chat
                  </Link>
                  <span className="plaidStatus">Deterministic</span>
                </div>
              </article>

              {explanation.driverSummary ? (
                <article className="panel">
                  <p className="label">Primary driver</p>
                  <p className="subvalue">{explanation.driverSummary}</p>
                  {primaryDriverCategory ? (
                    <p className="tiny">
                      Category: {primaryDriverCategory.categoryName}{" "}
                      {primaryDriverCategory.categoryBehaviorType
                        ? `· ${primaryDriverCategory.categoryBehaviorType}`
                        : ""}
                    </p>
                  ) : null}
                </article>
              ) : null}

              {explanation.historicalSummary ? (
                <article className="panel">
                  <p className="label">Historical context</p>
                  <p className="subvalue">{explanation.historicalSummary}</p>
                  {explanation.historicalContext ? (
                    <p className="tiny">
                      Based on {explanation.historicalContext.transactionCount} comparable
                      transactions over {explanation.historicalContext.lookbackDays} days.
                    </p>
                  ) : null}
                </article>
              ) : null}

              {selectedCategory ? (
                <article className="panel panel--detail">
                  <div className="detailHeader">
                    <div>
                      <p className="label">Category detail</p>
                      <h2 className="detailTitle">{selectedCategory.categoryName}</h2>
                    </div>
                    {selectedCategoryId !== explanation.primaryDriverCategoryId ? (
                      <Link className="detailClear" href="/">
                        Focus primary driver
                      </Link>
                    ) : (
                      <span className="detailClear detailClear--muted">Primary driver</span>
                    )}
                  </div>

                  <div className="detailGrid">
                    <div className="detailMetric">
                      <p className="detailMetricLabel">Behavior</p>
                      <p className="detailMetricValue">
                        {formatBehaviorType(selectedCategory.categoryBehaviorType)}
                      </p>
                    </div>
                    <div className="detailMetric">
                      <p className="detailMetricLabel">Planned</p>
                      <p className="detailMetricValue">
                        {formatCurrency(selectedCategory.plannedBudgetAmount)}
                      </p>
                    </div>
                    <div className="detailMetric">
                      <p className="detailMetricLabel">Actual</p>
                      <p className="detailMetricValue">
                        {formatCurrency(selectedCategory.actualSpendToDate)}
                      </p>
                    </div>
                    <div className="detailMetric">
                      <p className="detailMetricLabel">Projected variance</p>
                      <p className={`detailMetricValue ${selectedCategory.projectedVarianceAmount > 0 ? "amount--over" : "amount--under"}`}>
                        {formatSignedCurrency(selectedCategory.projectedVarianceAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="detailProgress">
                    <div className="detailProgressHeader">
                      <span className="detailProgressLabel">Spend pacing</span>
                      <span className="detailProgressValue">
                        {formatCurrency(selectedCategory.actualSpendToDate)} of{" "}
                        {formatCurrency(selectedCategory.plannedBudgetAmount)}
                      </span>
                    </div>
                    <div className="detailProgressBar">
                      <div
                        className="detailProgressFill"
                        style={{
                          width: selectedCategoryDetail
                            ? formatPercent(selectedCategoryDetail.progressPercent)
                            : "0%",
                        }}
                      />
                      <div
                        className="detailProgressForecast"
                        style={{
                          left: selectedCategoryDetail
                            ? `calc(${formatPercent(selectedCategoryDetail.projectedPercent)} - 1px)`
                            : "0%",
                        }}
                      />
                    </div>
                  <div className="detailProgressFoot">
                    <span>Remaining {formatCurrency(selectedCategoryDetail?.remainingAmount ?? 0)}</span>
                    <span>
                      Forecast {formatSignedCurrency(selectedCategory.projectedVarianceAmount)}
                    </span>
                  </div>
                </div>

                  <div className="detailInsightHeader">
                    <p className="sectionTitle">Category signal</p>
                    <span className="tiny">
                      {selectedCategoryIsPrimaryDriver
                        ? "Primary driver"
                        : "Reference category"}
                    </span>
                  </div>

                  <div className="detailInsightRow">
                    {selectedCategoryInsights.map((insight) => (
                      <div key={insight.label} className="detailInsight">
                        <p className="detailInsightLabel">{insight.label}</p>
                        <p className="detailInsightValue">{insight.value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="subvalue">
                    {buildCategoryPaceNote({
                      categoryBehaviorType: selectedCategory.categoryBehaviorType,
                      actualSpendToDate: selectedCategory.actualSpendToDate,
                      plannedBudgetAmount: selectedCategory.plannedBudgetAmount,
                      projectedVarianceAmount: selectedCategory.projectedVarianceAmount,
                    })}
                  </p>
                  <p className="tiny">{selectedCategoryDetail?.subtitle}</p>
                  {selectedCategoryIsPrimaryDriver && explanation.historicalContext ? (
                    <div className="detailHistory">
                      <p className="sectionTitle">Recent history</p>
                      <p className="subvalue">{explanation.historicalSummary}</p>
                      <p className="tiny">
                        {explanation.historicalContext.categoryName} averaged{" "}
                        {formatCurrency(
                          explanation.historicalContext.averageComparableSpend ?? 0
                        )} across {explanation.historicalContext.transactionCount} comparable
                        transactions over {explanation.historicalContext.lookbackDays} days.
                      </p>
                    </div>
                  ) : !selectedCategoryIsPrimaryDriver ? (
                    <div className="detailHistory detailHistory--empty">
                      <p className="sectionTitle">Recent history</p>
                      <p className="subvalue">
                        Historical context is shown when this category becomes the primary
                        driver. For now, this view stays focused on current pacing and projected
                        month-end impact.
                      </p>
                    </div>
                  ) : null}
                </article>
              ) : null}
            </div>

            <p className="tiny">
              Computed live for {result.period.asOfDate} using deterministic budget math and
              explanation data.
            </p>
          </section>

          <section className="grid2">
            <article className="panel">
              <p className="sectionTitle">Top over budget</p>
              {explanation.topOverBudgetCategories.length === 0 ? (
                <p className="emptyState">
                  No categories are currently projected over budget.
                </p>
              ) : (
                <ul className="list">
                  {explanation.topOverBudgetCategories.map((category) => (
                    <li key={category.categoryId} className="listItem">
                      <div>
                        <p className="listItemName">{category.categoryName}</p>
                        <p className="listItemMeta">Projected variance</p>
                      </div>
                      <div className="amount amount--over">
                        {displayCategoryAmount(category.projectedVarianceAmount)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel">
              <p className="sectionTitle">Top under budget</p>
              {explanation.topUnderBudgetCategories.length === 0 ? (
                <p className="emptyState">
                  No categories are currently projected under budget.
                </p>
              ) : (
                <ul className="list">
                  {explanation.topUnderBudgetCategories.map((category) => (
                    <li key={category.categoryId} className="listItem">
                      <div>
                        <p className="listItemName">{category.categoryName}</p>
                        <p className="listItemMeta">Projected variance</p>
                      </div>
                      <div className="amount amount--under">
                        {displayCategoryAmount(category.projectedVarianceAmount)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <section className="section">
            <article className="panel">
              <p className="sectionTitle">Plan vs forecast</p>
              <div className="list">
                {categories.map((category) => {
                  const varianceStyle: CSSProperties = {
                    width: `${Math.min(
                      100,
                      Math.max(
                        8,
                        (Math.abs(category.projectedVarianceAmount) /
                          Math.max(1, category.plannedBudgetAmount)) *
                          100
                      )
                    )}%`,
                  };

                  const isActive = category.categoryId === selectedCategoryId;

                  return (
                    <Link
                      key={category.categoryId}
                      href={getCategoryHref(category.categoryId)}
                      className={`listItem listItem--link ${isActive ? "listItem--active" : ""}`}
                    >
                      <div style={{ flex: 1 }}>
                        <div className="listItemHeading">
                          <p className="listItemName">{category.categoryName}</p>
                          <span className="railLinkMeta">
                            {formatBehaviorType(category.categoryBehaviorType)}
                          </span>
                        </div>
                        <p className="listItemMeta">
                          Planned {formatCurrency(category.plannedBudgetAmount)} · Actual{" "}
                          {formatCurrency(category.actualSpendToDate)} · Forecast{" "}
                          {formatSignedCurrency(category.projectedVarianceAmount)}
                        </p>
                        <div
                          style={{
                            marginTop: "10px",
                            height: "8px",
                            borderRadius: "999px",
                            background: "rgba(102, 112, 133, 0.12)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              ...varianceStyle,
                              height: "100%",
                              borderRadius: "inherit",
                              background:
                                category.projectedVarianceAmount > 0
                                  ? "linear-gradient(90deg, rgba(180,35,24,0.9), rgba(180,35,24,0.42))"
                                  : "linear-gradient(90deg, rgba(22,120,79,0.9), rgba(22,120,79,0.42))",
                            }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}
