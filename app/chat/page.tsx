import Link from "next/link";
import { BudgetChat } from "../components/budget-chat";
import { LogoutButton } from "../components/logout-button";
import { requirePageAuthSession } from "../../lib/auth/server-auth";
import { loadBudgetHealthDashboard } from "../../lib/budget-health/server/load-budget-health-dashboard";

export const dynamic = "force-dynamic";

function formatReadableTimestamp(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
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

type ChatPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
  }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const authSession = await requirePageAuthSession("/chat");
  const resolvedSearchParams = (await searchParams) ?? {};
  const state = await loadBudgetHealthDashboard(authSession.supabase);
  const selectedCategoryId =
    state.status === "ready"
      ? getSelectedCategoryId({
          searchParams: resolvedSearchParams,
          primaryDriverCategoryId: state.result.explanation.primaryDriverCategoryId,
          categories: state.result.categories.map((category) => ({
            categoryId: category.categoryId,
          })),
        })
      : null;
  const selectedCategory =
    state.status === "ready"
      ? state.result.categories.find(
          (category) => category.categoryId === selectedCategoryId
        ) ?? null
      : null;
  const chatCategories =
    state.status === "ready"
      ? state.result.categories.map((category) => ({
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          categoryBehaviorType: category.categoryBehaviorType,
          actualSpendToDate: category.actualSpendToDate,
          plannedBudgetAmount: category.plannedBudgetAmount,
          projectedVarianceAmount: category.projectedVarianceAmount,
          href: `/chat?category=${encodeURIComponent(category.categoryId)}`,
          dashboardHref: getCategoryHref(category.categoryId),
        }))
      : [];

  return (
    <main className="screen">
      <header className="shellHeader">
        <div className="shellBrand">
          <div className="shellMark">BB</div>
          <div>
            <p className="shellKicker">Budget Boss</p>
            <p className="shellTitle">Chat</p>
          </div>
        </div>
        <div className="shellActions">
          <Link className="shellLink" href="/">
            Budget health
          </Link>
          <Link className="shellLink" href="/settings">
            Connections
          </Link>
          <Link className="shellLink" href="/transactions">
            Review
          </Link>
          <LogoutButton />
          <div className="shellPill">
            {state.status === "ready" ? `Last updated ${formatReadableTimestamp(state.result.meta.computedAt)}` : "Budget snapshot unavailable"}
          </div>
        </div>
      </header>

      <div className="workspace workspace--single">
        <section className="hero">
          <div className="eyebrow">Chat</div>
          <h1 className="title">Ask about the month.</h1>
          <p className="lede">
            This is a deterministic chat surface grounded in the current budget-health
            snapshot. It can explain pace, confidence, history, and the categories
            driving the projection.
          </p>

          {state.status === "ready" ? (
            <div className="chatIntroGrid">
              <article className="panel panel--accent">
                <p className="label">Current direction</p>
                <p className="value">{state.result.explanation.summary}</p>
              </article>

              <article className="panel">
                <p className="label">Current driver</p>
                <p className="value">
                  {state.result.explanation.driverSummary ?? "No primary driver yet."}
                </p>
              </article>

              {selectedCategory ? (
                <article className="panel">
                  <p className="label">Selected category</p>
                  <p className="value">{selectedCategory.categoryName}</p>
                  <p className="subvalue">
                    {selectedCategory.categoryBehaviorType} · Planned{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(selectedCategory.plannedBudgetAmount)}
                  </p>
                  <div className="plaidPanelActions">
                    <Link className="shellLink" href={getCategoryHref(selectedCategory.categoryId)}>
                      Jump to category
                    </Link>
                  </div>
                </article>
              ) : null}
            </div>
          ) : (
            <article className="panel notice">
              <p className="label">Budget snapshot unavailable</p>
              <p className="subvalue">
                Connect Supabase to make the chat grounded in live budget-health data.
              </p>
            </article>
          )}

          {state.status === "ready" ? (
            <BudgetChat
              context={{
                asOfDate: state.asOfDate,
                budgetHealthScore: state.result.totals.budgetHealthScore,
                projectedMonthEndVariance: state.result.totals.projectedMonthEndVariance,
                direction: state.result.explanation.direction,
                confidence: state.result.explanation.confidence,
                summary: state.result.explanation.summary,
                driverSummary: state.result.explanation.driverSummary,
                historicalSummary: state.result.explanation.historicalSummary,
                primaryDriverCategoryName:
                  state.result.categories.find(
                    (category) =>
                      category.categoryId === state.result.explanation.primaryDriverCategoryId
                  )?.categoryName ?? null,
                topOverBudgetCategories: state.result.explanation.topOverBudgetCategories.map(
                  (category) => ({
                    categoryName: category.categoryName,
                    projectedVarianceAmount: category.projectedVarianceAmount,
                  })
                ),
                topUnderBudgetCategories: state.result.explanation.topUnderBudgetCategories.map(
                  (category) => ({
                    categoryName: category.categoryName,
                    projectedVarianceAmount: category.projectedVarianceAmount,
                  })
                ),
                selectedCategoryName: selectedCategory?.categoryName ?? null,
                selectedCategoryBehaviorType: selectedCategory?.categoryBehaviorType ?? null,
                selectedCategoryActualSpendToDate:
                  selectedCategory?.actualSpendToDate ?? null,
                selectedCategoryPlannedBudgetAmount:
                  selectedCategory?.plannedBudgetAmount ?? null,
                selectedCategoryProjectedVarianceAmount:
                  selectedCategory?.projectedVarianceAmount ?? null,
                selectedCategoryHref:
                  selectedCategory?.categoryId != null
                    ? getCategoryHref(selectedCategory.categoryId)
                    : null,
                period: {
                  daysElapsed: state.result.period.daysElapsed,
                  totalDaysInPeriod: state.result.period.totalDaysInPeriod,
                },
              }}
              categories={chatCategories}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
