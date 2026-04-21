import { describe, expect, it, vi } from "vitest";
import { exchangePublicTokenAndSync } from "./exchange-public-token-and-sync";

vi.mock("./sync-plaid-transactions", () => ({
  syncPlaidTransactions: vi.fn().mockResolvedValue({
    fetchedCount: 2,
    importedCount: 1,
    skippedPendingCount: 1,
    removedCount: 0,
    upsertedCount: 1,
    nextCursor: "cursor-2",
  }),
}));

import { syncPlaidTransactions } from "./sync-plaid-transactions";

describe("exchangePublicTokenAndSync", () => {
  it("exchanges a public token and syncs transactions", async () => {
    const itemPublicTokenExchange = vi.fn().mockResolvedValue({
      data: {
        access_token: "access-sandbox-token",
        item_id: "item-123",
      },
    });
    const plaidClient = { itemPublicTokenExchange } as any;
    const supabase = {} as any;

    const result = await exchangePublicTokenAndSync({
      plaidClient,
      supabase,
      userId: "user-123",
      publicToken: "public-sandbox-token",
    });

    expect(itemPublicTokenExchange).toHaveBeenCalledWith({
      public_token: "public-sandbox-token",
    });
    expect(syncPlaidTransactions).toHaveBeenCalledWith({
      plaidClient,
      supabase,
      userId: "user-123",
      accessToken: "access-sandbox-token",
      cursor: null,
    });
    expect(result).toEqual({
      accessToken: "access-sandbox-token",
      itemId: "item-123",
      fetchedCount: 2,
      importedCount: 1,
      skippedPendingCount: 1,
      removedCount: 0,
      upsertedCount: 1,
      nextCursor: "cursor-2",
    });
  });
});
