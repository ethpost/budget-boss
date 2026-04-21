import { describe, expect, it, vi } from "vitest";
import { getBudgetOwnerUserId } from "./get-budget-owner-user-id";

describe("getBudgetOwnerUserId", () => {
  it("loads the first active category owner user id", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ user_id: "user-123" }],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    const result = await getBudgetOwnerUserId(supabase);

    expect(from).toHaveBeenCalledWith("categories");
    expect(select).toHaveBeenCalledWith("user_id");
    expect(eq).toHaveBeenCalledWith("is_active", true);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toBe("user-123");
  });
});
