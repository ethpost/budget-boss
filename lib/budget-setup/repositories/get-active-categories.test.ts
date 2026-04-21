import { describe, expect, it, vi } from "vitest";
import { getActiveCategories } from "./get-active-categories";

describe("getActiveCategories", () => {
  it("loads active categories for a user", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "cat-1",
          name: "Dining Out",
          behavior_type: "discretionary",
        },
      ],
      error: null,
    });
    const eqIsActive = vi.fn().mockReturnValue({ order });
    const eqUser = vi.fn().mockReturnValue({ eq: eqIsActive });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    const result = await getActiveCategories(supabase, "user-123");

    expect(from).toHaveBeenCalledWith("categories");
    expect(select).toHaveBeenCalledWith("id, name, behavior_type");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-123");
    expect(eqIsActive).toHaveBeenCalledWith("is_active", true);
    expect(order).toHaveBeenCalledWith("name", { ascending: true });
    expect(result).toEqual([
      {
        categoryId: "cat-1",
        categoryName: "Dining Out",
        categoryBehaviorType: "discretionary",
      },
    ]);
  });
});
