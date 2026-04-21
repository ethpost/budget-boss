import { describe, expect, it, vi } from "vitest";
import { upsertTransactions } from "./upsert-transactions";

describe("upsertTransactions", () => {
  it("no-ops when there are no rows", async () => {
    const supabase = {
      from: vi.fn(),
    } as any;

    await expect(upsertTransactions(supabase, [])).resolves.toEqual({
      upsertedCount: 0,
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("upserts using the source dedupe key", async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: "tx-1" }], error: null });
    const upsert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ upsert });
    const supabase = { from } as any;

    const rows = [
      {
        user_id: "user-123",
        category_id: "cat-coffee",
        transaction_date: "2026-04-11",
        amount: 12.35,
        merchant_name: "Coffee Shop",
        description: "Morning latte",
        source: "plaid",
        source_transaction_id: "tx-abc",
        notes: "imported from bank feed",
      },
    ];

    await expect(upsertTransactions(supabase, rows)).resolves.toEqual({
      upsertedCount: 1,
    });

    expect(from).toHaveBeenCalledWith("transactions");
    expect(upsert).toHaveBeenCalledWith(rows, {
      onConflict: "user_id,source,source_transaction_id",
    });
  });
});
