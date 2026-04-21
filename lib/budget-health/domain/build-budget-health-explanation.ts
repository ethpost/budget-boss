export type BudgetHealthExplanationCategoryInput = {
  categoryId: string;
  categoryName: string;
  categoryBehaviorType?: "fixed" | "variable" | "discretionary";
  actualSpendToDate: number;
  plannedBudgetAmount: number;
  projectedVarianceAmount: number;
};

export type BudgetHealthExplanationDriver = {
  categoryId: string;
  categoryName: string;
  projectedVarianceAmount: number;
};

export type BudgetHealthExplanationSignal = {
  label: string;
  value: string;
};

export type BudgetHealthExplanationDirection =
  | "over_budget"
  | "under_budget"
  | "on_plan";

export type BudgetHealthExplanationConfidence = "low" | "medium" | "high";

export type BudgetHealthExplanationHistoricalContext = {
  isAvailable: boolean;
  lookbackDays: number;
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  averageComparableSpend: number | null;
};

export type BudgetHealthHistoricalContextDetails = {
  minComparableSpend: number | null;
  maxComparableSpend: number | null;
};

export type BudgetHealthExplanation = {
  direction: BudgetHealthExplanationDirection;
  confidence: BudgetHealthExplanationConfidence;
  primaryDriverCategoryId: string | null;
  summary: string;
  driverSummary: string | null;
  driverSignal: BudgetHealthExplanationSignal | null;
  topOverBudgetCategories: BudgetHealthExplanationDriver[];
  topUnderBudgetCategories: BudgetHealthExplanationDriver[];
  historicalContext: BudgetHealthExplanationHistoricalContext | null;
  historicalSummary: string | null;
};

function formatExplanationCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildDriverPhrase(categoryNames: string[]): string {
  if (categoryNames.length === 0) return "";
  if (categoryNames.length === 1) return categoryNames[0];
  if (categoryNames.length === 2) {
    return `${categoryNames[0]} and ${categoryNames[1]}`;
  }

  return `${categoryNames.slice(0, -1).join(", ")}, and ${
    categoryNames[categoryNames.length - 1]
  }`;
}

function computeExplanationConfidence(
  elapsedFraction: number
): BudgetHealthExplanationConfidence {
  if (elapsedFraction < 0.25) return "low";
  if (elapsedFraction < 0.6) return "medium";
  return "high";
}

function buildDriverSummary(params: {
  direction: BudgetHealthExplanationDirection;
  primaryDriverCategoryId: string | null;
  categories: BudgetHealthExplanationCategoryInput[];
}): string | null {
  const { direction, primaryDriverCategoryId, categories } = params;

  if (!primaryDriverCategoryId || direction === "on_plan") {
    return null;
  }

  const primaryDriverCategory = categories.find(
    (category) => category.categoryId === primaryDriverCategoryId
  );

  if (!primaryDriverCategory) {
    return null;
  }

  const behaviorType = primaryDriverCategory.categoryBehaviorType ?? "variable";
  const isFixed = behaviorType === "fixed";
  const targetLabel = isFixed ? "planned amount" : "monthly target";
  const trendLabel = isFixed ? "projected to finish" : "currently trending";
  const varianceDirection = direction === "over_budget" ? "above" : "below";
  const driverLabel =
    direction === "over_budget"
      ? "main over-budget driver"
      : "largest underrun";

  return `${primaryDriverCategory.categoryName} is the ${driverLabel}: ${formatExplanationCurrency(
    primaryDriverCategory.actualSpendToDate
  )} spent against a ${formatExplanationCurrency(
    primaryDriverCategory.plannedBudgetAmount
  )} ${targetLabel}, and it is ${trendLabel} ${formatExplanationCurrency(
    Math.abs(primaryDriverCategory.projectedVarianceAmount)
  )} ${varianceDirection} plan.`;
}

function buildOverBudgetSummary(params: {
  confidence: BudgetHealthExplanationConfidence;
  projectedMonthEndVariance: number;
  driverPhrase: string;
}): string {
  const { confidence, projectedMonthEndVariance, driverPhrase } = params;
  const amount = formatExplanationCurrency(projectedMonthEndVariance);

  if (confidence === "low") {
    return driverPhrase
      ? `Early in the month, you are currently pacing to be ${amount} over budget, driven mainly by ${driverPhrase}.`
      : `Early in the month, you are currently pacing to be ${amount} over budget.`;
  }

  if (confidence === "high") {
    return driverPhrase
      ? `You are on track to finish ${amount} over budget, driven mainly by ${driverPhrase}.`
      : `You are on track to finish ${amount} over budget.`;
  }

  return driverPhrase
    ? `You are projected to be ${amount} over budget, driven mainly by ${driverPhrase}.`
    : `You are projected to be ${amount} over budget.`;
}

function buildUnderBudgetSummary(params: {
  confidence: BudgetHealthExplanationConfidence;
  projectedMonthEndVariance: number;
  driverPhrase: string;
  label: string;
}): string {
  const { confidence, projectedMonthEndVariance, driverPhrase, label } = params;
  const amount = formatExplanationCurrency(Math.abs(projectedMonthEndVariance));

  if (confidence === "low") {
    return driverPhrase
      ? `Early in the month, you are currently pacing to be ${amount} under budget, ${label} ${driverPhrase}.`
      : `Early in the month, you are currently pacing to be ${amount} under budget.`;
  }

  if (confidence === "high") {
    return driverPhrase
      ? `You are on track to finish ${amount} under budget, ${label} ${driverPhrase}.`
      : `You are on track to finish ${amount} under budget.`;
  }

  return driverPhrase
    ? `You are projected to be ${amount} under budget, ${label} ${driverPhrase}.`
    : `You are projected to be ${amount} under budget.`;
}

function buildOnPlanSummary(confidence: BudgetHealthExplanationConfidence): string {
  if (confidence === "low") {
    return "Early in the month, you appear on track to finish the month on budget.";
  }

  if (confidence === "high") {
    return "You are on track to finish the month on budget.";
  }

  return "You are projected to finish the month on budget.";
}

function formatHistoricalSummaryCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildHistoricalSummary(
  historicalContext: BudgetHealthExplanationHistoricalContext | null,
  historicalContextDetails: BudgetHealthHistoricalContextDetails | null
): string | null {
  if (!historicalContext || !historicalContext.isAvailable) {
    return null;
  }

  const averageComparableSpend = historicalContext.averageComparableSpend;
  if (averageComparableSpend === null || !Number.isFinite(averageComparableSpend)) {
    return null;
  }

  const transactionLabel =
    historicalContext.transactionCount === 1
      ? "comparable transaction"
      : "comparable transactions";

  let interpretationNote = "";

  if (historicalContext.transactionCount < 5) {
    interpretationNote = " This is a small sample, so treat it as directional.";
  } else if (
    historicalContextDetails &&
    historicalContextDetails.minComparableSpend !== null &&
    historicalContextDetails.maxComparableSpend !== null
  ) {
    const spread =
      historicalContextDetails.maxComparableSpend -
      historicalContextDetails.minComparableSpend;
    const average = averageComparableSpend;

    if (average > 0) {
      const relativeSpread = spread / average;
      if (relativeSpread <= 0.4) {
        interpretationNote = " Recent spending here looks fairly steady.";
      } else if (relativeSpread >= 1) {
        interpretationNote = " Recent spending here varies quite a bit.";
      } else {
        interpretationNote = " Recent spending here is moderately varied.";
      }
    }
  }

  return `Over the last ${historicalContext.lookbackDays} days, ${historicalContext.categoryName} averaged ${formatHistoricalSummaryCurrency(
    averageComparableSpend
  )} across ${historicalContext.transactionCount} ${transactionLabel}.${interpretationNote}`;
}

function buildDriverSignal(params: {
  primaryDriverCategoryId: string | null;
  historicalContext: BudgetHealthExplanationHistoricalContext | null;
  historicalContextDetails: BudgetHealthHistoricalContextDetails | null;
}): BudgetHealthExplanationSignal | null {
  const {
    primaryDriverCategoryId,
    historicalContext,
    historicalContextDetails,
  } = params;

  if (!primaryDriverCategoryId || !historicalContext?.isAvailable) {
    return null;
  }

  if (historicalContext.transactionCount < 5) {
    return {
      label: "Stability",
      value: "Small sample",
    };
  }

  if (
    !historicalContextDetails ||
    historicalContextDetails.minComparableSpend === null ||
    historicalContextDetails.maxComparableSpend === null
  ) {
    return null;
  }

  const average = historicalContext.averageComparableSpend;
  if (average === null || average <= 0) {
    return null;
  }

  const spread =
    historicalContextDetails.maxComparableSpend -
    historicalContextDetails.minComparableSpend;
  const relativeSpread = spread / average;

  if (relativeSpread <= 0.4) {
    return {
      label: "Stability",
      value: "Steady",
    };
  }

  if (relativeSpread >= 1) {
    return {
      label: "Stability",
      value: "Variable",
    };
  }

  return {
    label: "Stability",
    value: "Mixed",
  };
}

export function buildBudgetHealthExplanation(params: {
  projectedMonthEndVariance: number;
  plannedBudgetAmount: number;
  elapsedFraction: number;
  categories: BudgetHealthExplanationCategoryInput[];
  historicalContext?: BudgetHealthExplanationHistoricalContext | null;
  historicalContextDetails?: BudgetHealthHistoricalContextDetails | null;
}): BudgetHealthExplanation {
  const {
    projectedMonthEndVariance,
    plannedBudgetAmount,
    elapsedFraction,
    categories,
    historicalContext,
    historicalContextDetails,
  } = params;

  const resolvedHistoricalContext = historicalContext ?? null;
  const resolvedHistoricalContextDetails = historicalContextDetails ?? null;
  const historicalSummary = buildHistoricalSummary(
    resolvedHistoricalContext,
    resolvedHistoricalContextDetails
  );

  const tolerance = Math.max(50, plannedBudgetAmount * 0.02);
  const confidence = computeExplanationConfidence(elapsedFraction);

  const topOverBudgetCategories: BudgetHealthExplanationDriver[] = categories
    .filter((category) => category.projectedVarianceAmount > 0)
    .sort((a, b) => b.projectedVarianceAmount - a.projectedVarianceAmount)
    .slice(0, 2)
    .map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      projectedVarianceAmount: category.projectedVarianceAmount,
    }));

  const topUnderBudgetCategories: BudgetHealthExplanationDriver[] = categories
    .filter((category) => category.projectedVarianceAmount < 0)
    .sort((a, b) => a.projectedVarianceAmount - b.projectedVarianceAmount)
    .slice(0, 2)
    .map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      projectedVarianceAmount: category.projectedVarianceAmount,
    }));

  let direction: BudgetHealthExplanationDirection = "on_plan";
  let primaryDriverCategoryId: string | null = null;
  let summary = buildOnPlanSummary(confidence);
  let driverSummary: string | null = null;
  let driverSignal: BudgetHealthExplanationSignal | null = null;

  const noSpendYet =
    categories.length > 0 &&
    categories.every((category) => category.actualSpendToDate === 0);

  if (noSpendYet) {
    return {
      direction: "on_plan",
      confidence,
      primaryDriverCategoryId: null,
      summary:
        "You haven’t spent yet this month. Your full budget is still available.",
      driverSummary: null,
      driverSignal: null,
      topOverBudgetCategories: [],
      topUnderBudgetCategories,
      historicalContext: resolvedHistoricalContext,
      historicalSummary,
    };
  }

  if (projectedMonthEndVariance > tolerance) {
    direction = "over_budget";
    primaryDriverCategoryId = topOverBudgetCategories[0]?.categoryId ?? null;

    const driverPhrase = buildDriverPhrase(
      topOverBudgetCategories.map((category) => category.categoryName)
    );

    summary = buildOverBudgetSummary({
      confidence,
      projectedMonthEndVariance,
      driverPhrase,
    });
  } else if (projectedMonthEndVariance < -tolerance) {
    direction = "under_budget";
    primaryDriverCategoryId = topUnderBudgetCategories[0]?.categoryId ?? null;

    const driverPhrase = buildDriverPhrase(
      topUnderBudgetCategories.map((category) => category.categoryName)
    );

    const label =
      topUnderBudgetCategories.length === 1
        ? "with the largest underrun in"
        : "with the largest underruns in";

    summary = buildUnderBudgetSummary({
      confidence,
      projectedMonthEndVariance,
      driverPhrase,
      label,
    });
  }

  driverSummary = buildDriverSummary({
    direction,
    primaryDriverCategoryId,
    categories,
  });

  driverSignal = buildDriverSignal({
    primaryDriverCategoryId,
    historicalContext: resolvedHistoricalContext,
    historicalContextDetails: resolvedHistoricalContextDetails,
  });

  return {
    direction,
    confidence,
    primaryDriverCategoryId,
    summary,
    driverSummary,
    driverSignal,
    topOverBudgetCategories,
    topUnderBudgetCategories,
    historicalContext: resolvedHistoricalContext,
    historicalSummary,
  };
}
