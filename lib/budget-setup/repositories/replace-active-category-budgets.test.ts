import { describe, expect, it, vi } from "vitest";
import { replaceActiveCategoryBudgets } from "./replace-active-category-budgets";

describe("replaceActiveCategoryBudgets", () => {
  it("replaces current active budget rows", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const deleteQuery = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ lte: vi.fn().mockReturnValue({ or: vi.fn().mockResolvedValue({ error: null }) }) }) });
    const from = vi.fn().mockImplementation((table) => {
      if (table === "category_budget_periods") {
        return {
          delete: () => ({
            eq: () => ({
              lte: () => ({
                or: deleteQuery,
              }),
            }),
          }),
          insert,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    const supabase = { from } as any;

    const result = await replaceActiveCategoryBudgets({
      supabase,
      userId: "user-123",
      asOfDate: "2026-04-12",
      rows: [
        {
          userId: "user-123",
          categoryId: "cat-1",
          monthlyBudget: 100,
          effectiveStartDate: "2026-04-01",
          effectiveEndDate: null,
        },
      ],
    });

    expect(result).toEqual({ insertedCount: 1 });
    expect(insert).toHaveBeenCalledWith([
      {
        user_id: "user-123",
        category_id: "cat-1",
        monthly_budget: 100,
        effective_start_date: "2026-04-01",
        effective_end_date: null,
      },
    ]);
  });
});
