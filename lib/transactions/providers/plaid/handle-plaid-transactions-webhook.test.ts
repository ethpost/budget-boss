import { describe, expect, it, vi } from "vitest";
import { handlePlaidTransactionsWebhook } from "./handle-plaid-transactions-webhook";

vi.mock("../../repositories/get-plaid-item-connection-by-item-id", () => ({
  getPlaidItemConnectionByItemId: vi.fn().mockResolvedValue({
    userId: "user-123",
    itemId: "item-123",
    accessToken: "access-token",
    cursor: "cursor-1",
    institutionName: "First Gingham Credit Union",
    lastSyncAt: null,
    lastWebhookAt: null,
  }),
}));

vi.mock("./sync-plaid-transactions", () => ({
  syncPlaidTransactions: vi.fn().mockResolvedValue({
    fetchedCount: 2,
    importedCount: 1,
    skippedPendingCount: 1,
    autoCategorizedCount: 1,
    categorizationNeedsReviewCount: 0,
    removedCount: 0,
    upsertedCount: 1,
    nextCursor: "cursor-2",
  }),
}));

vi.mock("../../repositories/upsert-plaid-item-connection", () => ({
  upsertPlaidItemConnection: vi.fn().mockResolvedValue(undefined),
}));

import { syncPlaidTransactions } from "./sync-plaid-transactions";
import { upsertPlaidItemConnection } from "../../repositories/upsert-plaid-item-connection";

describe("handlePlaidTransactionsWebhook", () => {
  it("syncs transactions for sync updates webhooks", async () => {
    const plaidClient = {} as any;
    const supabase = {} as any;

    const result = await handlePlaidTransactionsWebhook({
      plaidClient,
      supabase,
      payload: {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "item-123",
      },
    });

    expect(syncPlaidTransactions).toHaveBeenCalledWith({
      plaidClient,
      supabase,
      userId: "user-123",
      accessToken: "access-token",
      cursor: "cursor-1",
    });
    expect(upsertPlaidItemConnection).toHaveBeenCalled();
    expect(result).toEqual({
      handled: true,
      itemId: "item-123",
      userId: "user-123",
      fetchedCount: 2,
      importedCount: 1,
      removedCount: 0,
      skippedPendingCount: 1,
      autoCategorizedCount: 1,
      categorizationNeedsReviewCount: 0,
      upsertedCount: 1,
      nextCursor: "cursor-2",
    });
  });

  it("ignores unsupported webhook codes", async () => {
    const result = await handlePlaidTransactionsWebhook({
      plaidClient: {} as any,
      supabase: {} as any,
      payload: {
        webhook_type: "TRANSACTIONS",
        webhook_code: "INITIAL_UPDATE",
      },
    });

    expect(result).toEqual({
      handled: false,
      reason: "Unsupported webhook event.",
    });
  });
});
