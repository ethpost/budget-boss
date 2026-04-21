import { ActiveCategoryRow } from "../repositories/get-active-categories";
import { CategorizedTransactionHistoryRow } from "../repositories/get-categorized-transaction-history";

export type TrendBasedBudgetPlanCategory = {
  categoryId: string;
  categoryName: string;
  categoryBehaviorType: ActiveCategoryRow["categoryBehaviorType"];
  transactionCount: number;
  recentSpend: number;
  averageMonthlySpend: number;
  suggestedMonthlyBudget: number;
  budgetBasis: string;
};

export type TrendBasedBudgetPlan = {
  lookbackDays: number;
  totalRecentSpend: number;
  totalSuggestedBudget: number;
  categories: TrendBasedBudgetPlanCategory[];
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildTrendBasedBudgetPlan(params: {
  activeCategories: ActiveCategoryRow[];
  recentTransactions: CategorizedTransactionHistoryRow[];
  lookbackDays: number;
  currentMonthSpendByCategoryId?: Map<string, number>;
}): TrendBasedBudgetPlan {
  const {
    activeCategories,
    recentTransactions,
    lookbackDays,
    currentMonthSpendByCategoryId = new Map(),
  } = params;

  const spendByCategoryId = new Map<string, number>();
  const countByCategoryId = new Map<string, number>();

  for (const transaction of recentTransactions) {
    spendByCategoryId.set(
      transaction.categoryId,
      (spendByCategoryId.get(transaction.categoryId) ?? 0) + transaction.amount
    );
    countByCategoryId.set(
      transaction.categoryId,
      (countByCategoryId.get(transaction.categoryId) ?? 0) + 1
    );
  }

  const lookbackMonths = Math.max(lookbackDays / 30, 1);

  const categories = activeCategories.map((category) => {
    const recentSpend = roundCurrency(
      spendByCategoryId.get(category.categoryId) ?? 0
    );
    const transactionCount = countByCategoryId.get(category.categoryId) ?? 0;
    const averageMonthlySpend = roundCurrency(recentSpend / lookbackMonths);
    const currentMonthSpend = roundCurrency(
      currentMonthSpendByCategoryId.get(category.categoryId) ?? 0
    );
    const suggestedMonthlyBudget = roundCurrency(
      Math.max(averageMonthlySpend, currentMonthSpend)
    );
    const budgetBasis =
      transactionCount > 0
        ? `${transactionCount} transaction${
            transactionCount === 1 ? "" : "s"
          } over the last ${lookbackDays} days`
        : currentMonthSpend > 0
          ? `current month spend floor of $${currentMonthSpend.toFixed(0)}`
          : `no recent history in the last ${lookbackDays} days`;

    return {
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryBehaviorType: category.categoryBehaviorType,
      transactionCount,
      recentSpend,
      averageMonthlySpend,
      suggestedMonthlyBudget,
      budgetBasis,
    };
  });

  const totalRecentSpend = roundCurrency(
    categories.reduce((sum, category) => sum + category.recentSpend, 0)
  );
  const totalSuggestedBudget = roundCurrency(
    categories.reduce((sum, category) => sum + category.suggestedMonthlyBudget, 0)
  );

  return {
    lookbackDays,
    totalRecentSpend,
    totalSuggestedBudget,
    categories,
  };
}
