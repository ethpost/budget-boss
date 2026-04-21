import { describe, expect, it, vi } from "vitest";
import { upsertPlaidItemConnection } from "./upsert-plaid-item-connection";

describe("upsertPlaidItemConnection", () => {
  it("upserts plaid item connection state", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    const supabase = { from } as any;

    await upsertPlaidItemConnection({
      supabase,
      userId: "user-123",
      itemId: "item-123",
      accessToken: "access-token",
      cursor: "cursor-1",
      institutionName: "First Gingham Credit Union",
      lastSyncAt: "2026-04-12T18:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("plaid_item_connections");
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-123",
        item_id: "item-123",
        access_token: "access-token",
        cursor: "cursor-1",
        institution_name: "First Gingham Credit Union",
        last_sync_at: "2026-04-12T18:00:00.000Z",
        last_webhook_at: null,
      },
      {
        onConflict: "item_id",
      }
    );
  });
});
