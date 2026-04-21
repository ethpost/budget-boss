export type BudgetChatCategoryOption = {
  categoryId: string;
  categoryName: string;
  categoryBehaviorType: "fixed" | "variable" | "discretionary";
  actualSpendToDate: number;
  plannedBudgetAmount: number;
  projectedVarianceAmount: number;
  href: string;
  dashboardHref: string;
};

function normalizeMessage(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCategoryName(value: string): string {
  return value.trim().toLowerCase();
}

function isCategorySwitchIntent(message: string): boolean {
  return (
    message.includes("show me ") ||
    message.includes("focus on ") ||
    message.includes("switch to ") ||
    message.includes("go to ") ||
    message.includes("select ") ||
    message.includes("set category to ") ||
    message.includes("this category")
  );
}

export function resolveBudgetChatCategorySelection(params: {
  message: string;
  categories: BudgetChatCategoryOption[];
}): BudgetChatCategoryOption | null {
  const normalizedMessage = normalizeMessage(params.message);
  const switchIntent = isCategorySwitchIntent(normalizedMessage);

  const matchingCategory = params.categories
    .slice()
    .sort((left, right) => right.categoryName.length - left.categoryName.length)
    .find((category) => {
      const normalizedCategoryName = normalizeCategoryName(category.categoryName);
      return normalizedMessage.includes(normalizedCategoryName);
    });

  if (!matchingCategory) {
    return null;
  }

  if (switchIntent || normalizedMessage === normalizeCategoryName(matchingCategory.categoryName)) {
    return matchingCategory;
  }

  return null;
}
