"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

type PlaidLinkWindow = Window & {
  Plaid?: {
    create: (config: PlaidLinkConfig) => PlaidLinkHandler;
  };
};

type PlaidLinkHandler = {
  open: () => void;
  destroy?: () => void;
};

type PlaidLinkConfig = {
  token: string;
  onSuccess: (publicToken: string) => void;
  onExit?: () => void;
};

type PlaidConnectStatus =
  | "idle"
  | "loading-link-token"
  | "opening-link"
  | "syncing"
  | "connected"
  | "error";

type PlaidSyncResult = {
  itemId: string;
  fetchedCount: number;
  importedCount: number;
  removedCount: number;
  skippedPendingCount: number;
  upsertedCount: number;
  nextCursor: string | null;
  completedAt: string;
};

const LAST_SYNC_STORAGE_KEY = "budget-boss.plaid.last-sync";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    return payload.error;
  }

  return fallback;
}

export function PlaidLinkPanel(props: { enabled: boolean }) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<PlaidConnectStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<PlaidSyncResult | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as PlaidLinkWindow).Plaid) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as PlaidSyncResult;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof parsed.itemId === "string" &&
        typeof parsed.completedAt === "string"
      ) {
        setLastSyncResult(parsed);
      }
    } catch {
      window.localStorage.removeItem(LAST_SYNC_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!lastSyncResult) {
      window.localStorage.removeItem(LAST_SYNC_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      LAST_SYNC_STORAGE_KEY,
      JSON.stringify(lastSyncResult)
    );
  }, [lastSyncResult]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "loading-link-token":
        return "Preparing Plaid Link...";
      case "opening-link":
        return "Opening Plaid Link...";
      case "syncing":
        return "Syncing imported transactions...";
      case "connected":
        return "Connected";
      case "error":
        return "Connection failed";
      default:
        return "Ready";
    }
  }, [status]);

  const syncSummary = lastSyncResult
    ? [
        {
          label: "Imported",
          value: String(lastSyncResult.importedCount),
        },
        {
          label: "Upserted",
          value: String(lastSyncResult.upsertedCount),
        },
        {
          label: "Skipped",
          value: String(lastSyncResult.skippedPendingCount),
        },
        {
          label: "Removed",
          value: String(lastSyncResult.removedCount),
        },
      ]
    : [];

  function clearSyncHistory() {
    setLastSyncResult(null);
    setMessage("Saved sync audit cleared.");
  }

  async function handleConnect() {
    if (!props.enabled) {
      setStatus("error");
      setMessage("Plaid credentials are missing in the server environment.");
      return;
    }

    setMessage(null);
    setStatus("loading-link-token");

    try {
      const linkTokenResponse = await fetch("/api/plaid/link-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!linkTokenResponse.ok) {
        throw new Error(
          await readErrorMessage(linkTokenResponse, "Failed to create a Plaid link token.")
        );
      }

      const linkTokenPayload = (await linkTokenResponse.json()) as {
        link_token?: unknown;
      };

      if (
        typeof linkTokenPayload.link_token !== "string" ||
        linkTokenPayload.link_token.trim().length === 0
      ) {
        throw new Error("Plaid link token response was empty.");
      }

      const plaid = (window as PlaidLinkWindow).Plaid;
      if (!plaid) {
        throw new Error("Plaid Link failed to load.");
      }

      setStatus("opening-link");

      const handler = plaid.create({
        token: linkTokenPayload.link_token,
        onSuccess: (publicToken) => {
          void (async () => {
            try {
              setStatus("syncing");
              const exchangeResponse = await fetch("/api/plaid/exchange-public-token", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ publicToken }),
              });

              if (!exchangeResponse.ok) {
                throw new Error(
                  await readErrorMessage(
                    exchangeResponse,
                    "Plaid exchange completed, but the transaction sync failed."
                  )
                );
              }

              const syncResult = (await exchangeResponse.json()) as Partial<PlaidSyncResult> & {
                item_id?: string;
              };
              const completedAt = new Date().toISOString();
              setLastSyncResult({
                itemId:
                  typeof syncResult.item_id === "string"
                    ? syncResult.item_id
                    : typeof syncResult.itemId === "string"
                      ? syncResult.itemId
                      : "unknown",
                fetchedCount:
                  typeof syncResult.fetchedCount === "number" ? syncResult.fetchedCount : 0,
                importedCount:
                  typeof syncResult.importedCount === "number" ? syncResult.importedCount : 0,
                removedCount:
                  typeof syncResult.removedCount === "number" ? syncResult.removedCount : 0,
                skippedPendingCount:
                  typeof syncResult.skippedPendingCount === "number"
                    ? syncResult.skippedPendingCount
                    : 0,
                upsertedCount:
                  typeof syncResult.upsertedCount === "number" ? syncResult.upsertedCount : 0,
                nextCursor:
                  typeof syncResult.nextCursor === "string" ? syncResult.nextCursor : null,
                completedAt,
              });
              setStatus("connected");
              setMessage("Plaid sync completed. Refreshing the dashboard...");
              router.refresh();
            } catch (error) {
              setStatus("error");
              setMessage(error instanceof Error ? error.message : "Plaid sync failed.");
            }
          })();
        },
        onExit: () => {
          setStatus("idle");
          setMessage("Plaid Link was closed before finishing.");
        },
      });

      handler.open();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Plaid connection failed.");
    }
  }

  if (!props.enabled) {
    return (
      <article className="panel plaidPanel plaidPanel--disabled">
        <p className="label">Bank feeds</p>
        <p className="value">Plaid sandbox setup</p>
        <p className="subvalue">
          Add `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` to the server
          environment, then restart the app to enable live transaction sync.
        </p>
        <p className="tiny">Status: {statusLabel}</p>
      </article>
    );
  }

  return (
    <article className="panel plaidPanel">
      <Script
        id="plaid-link-script"
        src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <p className="label">Bank feeds</p>
      <p className="value">Connect Plaid sandbox</p>
      <p className="subvalue">
        Open Plaid Link, authorize a DEV institution, and sync the imported
        transactions into the budget-health screen.
      </p>
      <div className="plaidPanelActions">
        <button
          type="button"
          className="primaryButton"
          onClick={handleConnect}
          disabled={!scriptReady || status === "loading-link-token" || status === "opening-link" || status === "syncing"}
        >
          {status === "loading-link-token"
            ? "Preparing..."
            : status === "opening-link"
              ? "Open Link"
              : status === "syncing"
                ? "Syncing..."
                : "Connect Plaid"}
        </button>
        <span className={`plaidStatus plaidStatus--${status}`}>{statusLabel}</span>
      </div>
      {status === "connected" || status === "error" ? null : (
        <p className="tiny">The browser trigger stays here, while sync runs on the server.</p>
      )}
      {message ? <p className="tiny plaidPanelMessage">{message}</p> : null}
      {lastSyncResult ? (
        <div className="plaidSyncResult">
          <p className="sectionTitle">Last sync</p>
          <div className="plaidSyncGrid">
            {syncSummary.map((metric) => (
              <div key={metric.label} className="plaidSyncMetric">
                <p className="plaidSyncLabel">{metric.label}</p>
                <p className="plaidSyncValue">{metric.value}</p>
              </div>
            ))}
          </div>
          <p className="tiny">
            Synced at {new Date(lastSyncResult.completedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            .
          </p>
          <div className="plaidPanelActions">
            <button
              type="button"
              className="chatChip"
              onClick={clearSyncHistory}
            >
              Clear saved audit
            </button>
            <span className="plaidStatus">Stored locally in this browser</span>
          </div>
        </div>
      ) : null}
      <p className="tiny">
        Uses the server-side Plaid credentials and syncs into `transactions`.
      </p>
    </article>
  );
}
