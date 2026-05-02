import Link from "next/link";
import { LogoutButton } from "../components/logout-button";
import { requirePageAuthSession } from "../../lib/auth/server-auth";
import { getActiveCategories } from "../../lib/budget-setup/repositories/get-active-categories";
import { getPeriodContext } from "../../lib/budget-health/domain/get-period-context";
import { getBudgetHealthAsOfDate } from "../../lib/budget-health/server/load-budget-health-dashboard";
import { getCategorizationCoverage } from "../../lib/transactions/repositories/get-categorization-coverage";
import { getUncategorizedTransactionGroups } from "../../lib/transactions/repositories/get-uncategorized-transaction-groups";

export const dynamic = "force-dynamic";

type TransactionsPageProps = {
  searchParams?: Promise<{
    saved?: string | string[];
    error?: string | string[];
  }>;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function buildCoverageNote(params: {
  categorizedSpendCoverageRatio: number;
  uncategorizedSpendAmount: number;
}): string {
  if (params.uncategorizedSpendAmount <= 0) {
    return "Budget Health is using all current-month Plaid spend that has synced so far.";
  }

  if (params.categorizedSpendCoverageRatio >= 0.9) {
    return "Budget Health has strong categorization coverage for the current month.";
  }

  if (params.categorizedSpendCoverageRatio >= 0.6) {
    return "Budget Health is usable, but uncategorized spend can still move the score.";
  }

  return "Budget Health coverage is low until more current-month spend is categorized.";
}

function normalizeSearchParam(value?: string | string[]): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const authSession = await requirePageAuthSession("/transactions");
  const params = (await searchParams) ?? {};
  const saved = normalizeSearchParam(params.saved) === "1";
  const error = normalizeSearchParam(params.error);
  const asOfDate = getBudgetHealthAsOfDate();
  const period = getPeriodContext(asOfDate);

  const [activeCategories, uncategorizedGroups, categorizationCoverage] =
    await Promise.all([
      getActiveCategories(authSession.supabase, authSession.user.id),
      getUncategorizedTransactionGroups({
        supabase: authSession.supabase,
        userId: authSession.user.id,
        source: "plaid",
        limit: 100,
      }),
      getCategorizationCoverage({
        supabase: authSession.supabase,
        userId: authSession.user.id,
        periodStartDate: period.periodStartDate,
        asOfDate,
        source: "plaid",
      }),
    ]);

  const uncategorizedTransactionCount = uncategorizedGroups.reduce(
    (sum, group) => sum + group.transactionCount,
    0
  );

  return (
    <main className="screen">
      <header className="shellHeader">
        <div className="shellBrand">
          <div className="shellMark">BB</div>
          <div>
            <p className="shellKicker">Budget Boss</p>
            <p className="shellTitle">Transaction review</p>
          </div>
        </div>
        <div className="shellActions">
          <Link className="shellLink" href="/">
            Budget health
          </Link>
          <Link className="shellLink" href="/budget">
            Budgets
          </Link>
          <Link className="shellLink" href="/settings">
            Connections
          </Link>
          <LogoutButton />
          <div className="shellPill">{uncategorizedTransactionCount} need review</div>
        </div>
      </header>

      <div className="workspace workspace--single">
        <section className="hero">
          <div className="eyebrow">Exceptions inbox</div>
          <h1 className="title">Review what automation could not classify.</h1>
          <p className="lede">
            Assign one category to a merchant group. Future imports from the same
            merchant can use that correction as learned history.
          </p>

          {saved ? (
            <p className="statusBanner statusBanner--success">
              Category assignment saved.
            </p>
          ) : null}
          {error ? (
            <p className="statusBanner statusBanner--error">{error}</p>
          ) : null}

          <div className="metricRow">
            <div className="metricCard">
              <p className="label">Groups</p>
              <p className="value">{uncategorizedGroups.length}</p>
              <p className="subvalue">Merchant groups waiting for a category</p>
            </div>
            <div className="metricCard">
              <p className="label">Transactions</p>
              <p className="value">{uncategorizedTransactionCount}</p>
              <p className="subvalue">Rows that are not affecting category budgets yet</p>
            </div>
          </div>

          <div className="section">
            <div className="sectionHeader">
              <p className="sectionTitle">Budget Health coverage</p>
              <span className="chip">
                Current period {period.periodStartDate} → {asOfDate}
              </span>
            </div>
            <div className="metricRow metricRow--compact">
              <div className="miniMetric">
                <p className="label">Spend covered</p>
                <p className="value">
                  {formatPercent(
                    categorizationCoverage.categorizedSpendCoverageRatio
                  )}
                </p>
                <p className="subvalue">
                  Share of current-month Plaid spend included in Budget Health
                </p>
              </div>
              <div className="miniMetric">
                <p className="label">Categorized spend</p>
                <p className="value">
                  {formatCurrency(categorizationCoverage.categorizedSpendAmount)}
                </p>
                <p className="subvalue">
                  {categorizationCoverage.categorizedTransactionCount} current-month
                  rows with a category
                </p>
              </div>
              <div className="miniMetric">
                <p className="label">Uncategorized spend</p>
                <p className="value">
                  {formatCurrency(
                    categorizationCoverage.uncategorizedSpendAmount
                  )}
                </p>
                <p className="subvalue">
                  {categorizationCoverage.uncategorizedTransactionCount} current-month
                  rows not yet counted by category
                </p>
              </div>
            </div>
            <p className="coverageNote">
              {buildCoverageNote(categorizationCoverage)}
            </p>
          </div>

          <div className="section">
            <p className="sectionTitle">Needs review</p>
            {uncategorizedGroups.length > 0 ? (
              <ul className="reviewList">
                {uncategorizedGroups.map((group) => (
                  <li key={group.groupKey} className="reviewItem">
                    <div className="reviewItemMain">
                      <p className="listItemName">{group.displayName}</p>
                      <p className="listItemMeta">
                        {group.transactionCount} transaction
                        {group.transactionCount === 1 ? "" : "s"} · Latest{" "}
                        {group.latestTransactionDate} · Total{" "}
                        {formatCurrency(group.totalAmount)}
                      </p>
                      {group.sampleDescriptions.length > 0 ? (
                        <div className="chipRow">
                          {group.sampleDescriptions.map((description) => (
                            <span className="chip" key={description}>
                              {description}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <form
                      className="reviewForm"
                      action="/api/transactions/categorize"
                      method="post"
                    >
                      {group.sourceTransactionIds.map((sourceTransactionId) => (
                        <input
                          key={sourceTransactionId}
                          type="hidden"
                          name="sourceTransactionId"
                          value={sourceTransactionId}
                        />
                      ))}
                      <label className="reviewField">
                        <span className="label">Category</span>
                        <select
                          className="reviewSelect"
                          name="categoryId"
                          required
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Choose category
                          </option>
                          {activeCategories.map((category) => (
                            <option
                              key={category.categoryId}
                              value={category.categoryId}
                            >
                              {category.categoryName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="primaryButton" type="submit">
                        Apply
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="emptyState">
                Nothing needs review. New Plaid imports will appear here only when
                automation cannot pick a category.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
