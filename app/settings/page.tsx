import Link from "next/link";
import { PlaidLinkPanel } from "../components/plaid-link-panel";
import { buildTransactionImportAudit } from "../../lib/transactions/domain/build-transaction-import-audit";
import { getRecentTransactions } from "../../lib/transactions/repositories/get-recent-transactions";
import { requirePageAuthSession } from "../../lib/auth/server-auth";

export const dynamic = "force-dynamic";

function formatReadableTimestamp(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateRange(
  earliestTransactionDate: string | null,
  latestTransactionDate: string | null
): string {
  if (!earliestTransactionDate || !latestTransactionDate) {
    return "No transactions yet";
  }

  if (earliestTransactionDate === latestTransactionDate) {
    return earliestTransactionDate;
  }

  return `${earliestTransactionDate} to ${latestTransactionDate}`;
}

export default async function SettingsPage() {
  const authSession = await requirePageAuthSession("/settings");
  const plaidConfigured =
    Boolean(process.env.PLAID_CLIENT_ID) && Boolean(process.env.PLAID_SECRET);
  const budgetOwnerUserId = authSession.user.id;
  const recentTransactions =
    await getRecentTransactions({
      supabase: authSession.supabase,
      userId: budgetOwnerUserId,
      source: "plaid",
      limit: 12,
    }).catch(() => []);
  const recentImportAudit = buildTransactionImportAudit(recentTransactions);

  return (
    <main className="screen">
      <header className="shellHeader">
        <div className="shellBrand">
          <div className="shellMark">BB</div>
          <div>
            <p className="shellKicker">Budget Boss</p>
            <p className="shellTitle">Settings</p>
          </div>
        </div>
        <div className="shellActions">
          <Link className="shellLink" href="/budget">
            Budgets
          </Link>
          <Link className="shellLink" href="/chat">
            Chat
          </Link>
          <Link className="shellLink" href="/">
            Back to budget health
          </Link>
          <Link className="shellLink" href="/api/auth/logout">
            Sign out
          </Link>
          <div className="shellPill">Connections and app controls</div>
        </div>
      </header>

      <div className="workspace workspace--single">
        <section className="hero">
          <div className="eyebrow">Connections</div>
          <h1 className="title">Manage bank feeds.</h1>
          <p className="lede">
            Plaid lives here so the budgeting surface stays focused on pacing,
            projections, and decision support. The sync still runs through the app
            server and lands in Supabase.
          </p>
          <p className="tiny">Last refreshed: {formatReadableTimestamp(new Date().toISOString())}</p>

          <div className="grid2">
            <PlaidLinkPanel enabled={plaidConfigured} />

            <article className="panel">
              <p className="label">Recent imports</p>
              <p className="value">What came in last</p>
              <p className="subvalue">
                The latest Plaid rows for the current app user are shown here so you can
                sanity-check the feed without hunting through tables.
              </p>
              <div className="section">
                <p className="sectionTitle">Import audit</p>
                <div className="metricRow metricRow--compact">
                  <div className="miniMetric">
                    <p className="label">Rows</p>
                    <p className="value">{recentImportAudit.transactionCount}</p>
                    <p className="subvalue">Recent Plaid transactions loaded</p>
                  </div>
                  <div className="miniMetric">
                    <p className="label">Amount</p>
                    <p className="value">{formatCurrency(recentImportAudit.totalAmount)}</p>
                    <p className="subvalue">Net value across the current sample</p>
                  </div>
                  <div className="miniMetric">
                    <p className="label">Categorized</p>
                    <p className="value">{recentImportAudit.categorizedTransactionCount}</p>
                    <p className="subvalue">Rows already linked to categories</p>
                  </div>
                  <div className="miniMetric">
                    <p className="label">Uncategorized</p>
                    <p className="value">{recentImportAudit.uncategorizedTransactionCount}</p>
                    <p className="subvalue">Rows that still need a category</p>
                  </div>
                  <div className="miniMetric">
                    <p className="label">Range</p>
                    <p className="value">
                      {formatDateRange(
                        recentImportAudit.earliestTransactionDate,
                        recentImportAudit.latestTransactionDate
                      )}
                    </p>
                    <p className="subvalue">Oldest to newest in the current sample</p>
                  </div>
                </div>
                <div className="sectionHeader">
                  <p className="sectionTitle">Source mix</p>
                  <div className="chipRow">
                    {recentImportAudit.sources.length > 0 ? (
                      recentImportAudit.sources.map((source) => (
                        <span key={source.source} className="chip">
                          {source.source} · {source.count}
                        </span>
                      ))
                    ) : (
                      <span className="chip">No sources yet</span>
                    )}
                  </div>
                </div>
                <div className="sectionHeader">
                  <p className="sectionTitle">Category coverage</p>
                  <div className="chipRow">
                    {recentImportAudit.categories.length > 0 ? (
                      recentImportAudit.categories.map((category) => (
                        <span key={category.categoryId} className="chip">
                          {category.categoryId} · {category.count}
                        </span>
                      ))
                    ) : (
                      <span className="chip">No categorized rows yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="section">
                <p className="sectionTitle">Last synced rows</p>
                {recentTransactions.length > 0 ? (
                  <ul className="list">
                    {recentTransactions.map((transaction) => (
                      <li key={transaction.sourceTransactionId} className="listItem">
                        <div>
                          <p className="listItemName">
                            {transaction.merchantName ?? transaction.description ?? "Untitled"}
                          </p>
                          <p className="listItemMeta">
                            {transaction.transactionDate} · {transaction.source}
                            {transaction.categoryId ? ` · ${transaction.categoryId}` : ""}
                          </p>
                        </div>
                        <div className="amount amount--plan">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="emptyState">
                    No Plaid transactions are stored yet for this user.
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
