import { describe, expect, it, vi } from "vitest";
import { getPlaidItemConnectionByItemId } from "./get-plaid-item-connection-by-item-id";

describe("getPlaidItemConnectionByItemId", () => {
  it("loads a plaid item connection by item id", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: "user-123",
        item_id: "item-123",
        access_token: "access-token",
        cursor: "cursor-1",
        institution_name: "First Gingham Credit Union",
        last_sync_at: "2026-04-12T18:00:00.000Z",
        last_webhook_at: null,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    const result = await getPlaidItemConnectionByItemId(supabase, "item-123");

    expect(from).toHaveBeenCalledWith("plaid_item_connections");
    expect(select).toHaveBeenCalledWith(
      "user_id, item_id, access_token, cursor, institution_name, last_sync_at, last_webhook_at"
    );
    expect(eq).toHaveBeenCalledWith("item_id", "item-123");
    expect(result).toEqual({
      userId: "user-123",
      itemId: "item-123",
      accessToken: "access-token",
      cursor: "cursor-1",
      institutionName: "First Gingham Credit Union",
      lastSyncAt: "2026-04-12T18:00:00.000Z",
      lastWebhookAt: null,
    });
  });
});
