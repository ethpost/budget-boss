import { describe, expect, it, vi } from "vitest";
import { getCategorizedTransactionHistory } from "./get-categorized-transaction-history";

describe("getCategorizedTransactionHistory", () => {
  it("loads categorized transactions in the date window", async () => {
    const not = vi.fn().mockResolvedValue({
      data: [
        {
          category_id: "cat-1",
          amount: 18,
          transaction_date: "2026-04-12",
        },
      ],
      error: null,
    });
    const lte = vi.fn().mockReturnValue({ not });
    const gte = vi.fn().mockReturnValue({ lte });
    const eqUser = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq: eqUser });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    const result = await getCategorizedTransactionHistory({
      supabase,
      userId: "user-123",
      lookbackWindowStartDate: "2026-01-01",
      lookbackWindowEndDate: "2026-04-12",
    });

    expect(from).toHaveBeenCalledWith("transactions");
    expect(select).toHaveBeenCalledWith(
      "category_id, amount, transaction_date"
    );
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-123");
    expect(gte).toHaveBeenCalledWith("transaction_date", "2026-01-01");
    expect(lte).toHaveBeenCalledWith("transaction_date", "2026-04-12");
    expect(not).toHaveBeenCalledWith("category_id", "is", null);
    expect(result).toEqual([
      {
        categoryId: "cat-1",
        amount: 18,
        transactionDate: "2026-04-12",
      },
    ]);
  });
});
