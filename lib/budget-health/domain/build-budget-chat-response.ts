import type {
  BudgetHealthExplanationConfidence,
  BudgetHealthExplanationDirection,
} from "./build-budget-health-explanation";

export type BudgetChatCategorySummary = {
  categoryName: string;
  projectedVarianceAmount: number;
};

export type BudgetChatContext = {
  asOfDate: string;
  budgetHealthScore: number;
  projectedMonthEndVariance: number;
  direction: BudgetHealthExplanationDirection;
  confidence: BudgetHealthExplanationConfidence;
  summary: string;
  driverSummary: string | null;
  historicalSummary: string | null;
  primaryDriverCategoryName: string | null;
  selectedCategoryName: string | null;
  selectedCategoryBehaviorType: "fixed" | "variable" | "discretionary" | null;
  selectedCategoryActualSpendToDate: number | null;
  selectedCategoryPlannedBudgetAmount: number | null;
  selectedCategoryProjectedVarianceAmount: number | null;
  selectedCategoryHref: string | null;
  topOverBudgetCategories: BudgetChatCategorySummary[];
  topUnderBudgetCategories: BudgetChatCategorySummary[];
  period: {
    daysElapsed: number;
    totalDaysInPeriod: number;
  };
};

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function buildTopCategoriesLine(params: {
  overBudgetCategories: BudgetChatCategorySummary[];
  underBudgetCategories: BudgetChatCategorySummary[];
}): string {
  const { overBudgetCategories, underBudgetCategories } = params;
  const parts: string[] = [];

  if (overBudgetCategories[0]) {
    parts.push(
      `${overBudgetCategories[0].categoryName} is the largest over-budget driver at ${formatSignedCurrency(overBudgetCategories[0].projectedVarianceAmount)}`
    );
  }

  if (underBudgetCategories[0]) {
    parts.push(
      `${underBudgetCategories[0].categoryName} is the largest underrun at ${formatSignedCurrency(underBudgetCategories[0].projectedVarianceAmount)}`
    );
  }

  return parts.join(". ");
}

function formatBehaviorType(behaviorType: "fixed" | "variable" | "discretionary"): string {
  switch (behaviorType) {
    case "fixed":
      return "fixed";
    case "discretionary":
      return "discretionary";
    default:
      return "variable";
  }
}

function buildConfidenceLine(confidence: BudgetHealthExplanationConfidence, daysElapsed: number, totalDaysInPeriod: number): string {
  const monthProgress = Math.round((daysElapsed / Math.max(1, totalDaysInPeriod)) * 100);

  if (confidence === "low") {
    return `Confidence is low because we are still early in the month at ${monthProgress}% through the period.`;
  }

  if (confidence === "high") {
    return `Confidence is high because we are ${monthProgress}% through the month and the projection is settling in.`;
  }

  return `Confidence is medium with ${monthProgress}% of the month complete.`;
}

export function buildBudgetChatResponse(params: {
  message: string;
  context: BudgetChatContext;
}): string {
  const normalizedMessage = normalizeMessage(params.message);
  const { context } = params;
  const selectedCategorySummary =
    context.selectedCategoryName &&
    context.selectedCategoryBehaviorType &&
    context.selectedCategoryActualSpendToDate !== null &&
    context.selectedCategoryPlannedBudgetAmount !== null &&
    context.selectedCategoryProjectedVarianceAmount !== null
      ? `${context.selectedCategoryName} is currently a ${formatBehaviorType(
          context.selectedCategoryBehaviorType
        )} category with ${formatCurrency(
          context.selectedCategoryActualSpendToDate
        )} spent against ${formatCurrency(
          context.selectedCategoryPlannedBudgetAmount
        )} planned and a projected variance of ${formatSignedCurrency(
          context.selectedCategoryProjectedVarianceAmount
        )}.`
      : null;

  if (
    normalizedMessage.includes("history") ||
    normalizedMessage.includes("historical") ||
    normalizedMessage.includes("compare")
  ) {
    if (context.historicalSummary) {
      return `${context.historicalSummary} This is reference-only for now, but it helps frame the current pace.`;
    }

    return "There is no primary-driver historical context available yet for this snapshot.";
  }

  if (
    normalizedMessage.includes("confidence") ||
    normalizedMessage.includes("confident") ||
    normalizedMessage.includes("certain") ||
    normalizedMessage.includes("sure")
  ) {
    return buildConfidenceLine(
      context.confidence,
      context.period.daysElapsed,
      context.period.totalDaysInPeriod
    );
  }

  if (
    normalizedMessage.includes("this category") ||
    normalizedMessage.includes("selected category") ||
    (context.selectedCategoryName &&
      normalizedMessage.includes(normalizeMessage(context.selectedCategoryName))) ||
    normalizedMessage.includes("show me this") ||
    normalizedMessage.includes("focus this")
  ) {
    return selectedCategorySummary ?? "No selected category context is available yet.";
  }

  if (
    normalizedMessage.includes("driver") ||
    normalizedMessage.includes("driving") ||
    normalizedMessage.includes("why") ||
    normalizedMessage.includes("cause")
  ) {
    const parts = [context.summary];
    if (selectedCategorySummary) parts.push(selectedCategorySummary);
    if (context.driverSummary) parts.push(context.driverSummary);
    const topCategoriesLine = buildTopCategoriesLine({
      overBudgetCategories: context.topOverBudgetCategories,
      underBudgetCategories: context.topUnderBudgetCategories,
    });
    if (topCategoriesLine) parts.push(topCategoriesLine);
    return parts.join(" ");
  }

  if (
    normalizedMessage.includes("over budget") ||
    normalizedMessage.includes("under budget") ||
    normalizedMessage.includes("forecast") ||
    normalizedMessage.includes("variance")
  ) {
    const pieces = [
      `Right now the month is ${formatSignedCurrency(context.projectedMonthEndVariance)} relative to plan.`,
      context.summary,
    ];

    const topCategoriesLine = buildTopCategoriesLine({
      overBudgetCategories: context.topOverBudgetCategories,
      underBudgetCategories: context.topUnderBudgetCategories,
    });
    if (topCategoriesLine) pieces.push(topCategoriesLine);
    return pieces.join(" ");
  }

  if (
    normalizedMessage.includes("help") ||
    normalizedMessage.includes("suggest") ||
    normalizedMessage.includes("what can you do")
  ) {
    return "I can explain the current month, the main driver, the historical context, or the biggest over- and under-budget categories.";
  }

  if (selectedCategorySummary) {
    return `Selected category: ${selectedCategorySummary} Ask me about ${context.selectedCategoryName}, the historical context, or the month-end projection. Use the dashboard link to jump back to it.`;
  }

  if (context.primaryDriverCategoryName) {
    return `Ask me about ${context.primaryDriverCategoryName}, the historical context, or the month-end projection.`;
  }

  return "Ask me about the month-end projection, confidence, or the largest category drivers.";
}
