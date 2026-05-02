import type { BehaviorTransactionRow } from "../../transactions/repositories/get-behavior-transactions";

export type BuyingBehaviorEvidenceCategory = {
  categoryId: string;
  categoryName: string;
  currentMonthSpend: number;
  currentMonthTransactionCount: number;
  baselineMonthlyAverageSpend: number;
  baselineMonthlyAverageTransactionCount: number;
  spendDeltaVsBaseline: number;
  projectedVarianceAmount: number;
  plannedBudgetAmount: number;
};

export type BuyingBehaviorEvidenceMerchant = {
  merchantName: string;
  currentMonthSpend: number;
  currentMonthTransactionCount: number;
  baselineMonthlyAverageSpend: number;
  baselineMonthlyAverageTransactionCount: number;
  spendDeltaVsBaseline: number;
  categoryName: string | null;
};

export type BuyingBehaviorEvidence = {
  asOfDate: string;
  question: string;
  period: {
    periodStartDate: string;
    daysElapsed: number;
    totalDaysInPeriod: number;
    monthProgressPercent: number;
    baselineLookbackDays: number;
  };
  budgetHealth: {
    score: number;
    status: "under_plan" | "on_plan" | "over_plan";
    projectedMonthEndVariance: number;
    plannedBudgetAmount: number;
    actualSpendToDate: number;
    summary: string;
    confidence: "low" | "medium" | "high";
    primaryDriverCategoryName: string | null;
  };
  categorySignals: BuyingBehaviorEvidenceCategory[];
  merchantSignals: BuyingBehaviorEvidenceMerchant[];
  recurringMerchantCandidates: BuyingBehaviorEvidenceMerchant[];
  recentLargeTransactions: BuyingBehaviorEvidenceMerchant[];
  caveats: string[];
};

type CategoryInput = {
  categoryId: string;
  categoryName: string;
  plannedBudgetAmount: number;
  actualSpendToDate: number;
  projectedVarianceAmount: number;
};

export type BuildBuyingBehaviorEvidenceParams = {
  question: string;
  asOfDate: string;
  periodStartDate: string;
  daysElapsed: number;
  totalDaysInPeriod: number;
  budgetHealth: BuyingBehaviorEvidence["budgetHealth"];
  categories: CategoryInput[];
  transactions: BehaviorTransactionRow[];
};

type Rollup = {
  spend: number;
  count: number;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundCount(value: number): number {
  return Math.round(value * 10) / 10;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function monthScaleFactor(lookbackDays: number): number {
  return lookbackDays / 30;
}

function normalizeMerchant(transaction: BehaviorTransactionRow): string {
  return (
    transaction.merchantName?.trim() ||
    transaction.description?.trim() ||
    "Unknown merchant"
  );
}

function addRollup(map: Map<string, Rollup>, key: string, amount: number) {
  const current = map.get(key) ?? { spend: 0, count: 0 };
  current.spend += Math.abs(amount);
  current.count += 1;
  map.set(key, current);
}

function getRollup(map: Map<string, Rollup>, key: string): Rollup {
  return map.get(key) ?? { spend: 0, count: 0 };
}

function compareAbsoluteDelta(
  left: { spendDeltaVsBaseline: number },
  right: { spendDeltaVsBaseline: number }
): number {
  return (
    Math.abs(right.spendDeltaVsBaseline) - Math.abs(left.spendDeltaVsBaseline)
  );
}

function compareCurrentSpend(
  left: { currentMonthSpend: number },
  right: { currentMonthSpend: number }
): number {
  return right.currentMonthSpend - left.currentMonthSpend;
}

function buildCaveats(params: {
  currentTransactionCount: number;
  baselineTransactionCount: number;
  daysElapsed: number;
  totalDaysInPeriod: number;
}): string[] {
  const caveats: string[] = [];
  const monthProgressPercent = Math.round(
    (params.daysElapsed / Math.max(1, params.totalDaysInPeriod)) * 100
  );

  if (params.currentTransactionCount < 10) {
    caveats.push(
      `Only ${params.currentTransactionCount} current-month Plaid transactions are in the evidence.`
    );
  }

  if (params.baselineTransactionCount < 20) {
    caveats.push(
      `The baseline has ${params.baselineTransactionCount} transactions, so comparisons may be directional.`
    );
  }

  if (monthProgressPercent < 35) {
    caveats.push(
      `The month is ${monthProgressPercent}% complete, so pace-based conclusions should stay conservative.`
    );
  }

  return caveats;
}

export function buildBuyingBehaviorEvidence(
  params: BuildBuyingBehaviorEvidenceParams
): BuyingBehaviorEvidence {
  const categoryById = new Map(
    params.categories.map((category) => [category.categoryId, category])
  );
  const currentCategoryRollups = new Map<string, Rollup>();
  const baselineCategoryRollups = new Map<string, Rollup>();
  const currentMerchantRollups = new Map<string, Rollup>();
  const baselineMerchantRollups = new Map<string, Rollup>();
  const merchantCategoryIds = new Map<string, Map<string, number>>();
  let currentTransactionCount = 0;
  let baselineTransactionCount = 0;

  for (const transaction of params.transactions) {
    const isCurrentMonth = transaction.transactionDate >= params.periodStartDate;
    const categoryKey = transaction.categoryId ?? "uncategorized";
    const merchantKey = normalizeMerchant(transaction);

    if (isCurrentMonth) {
      currentTransactionCount += 1;
      addRollup(currentCategoryRollups, categoryKey, transaction.amount);
      addRollup(currentMerchantRollups, merchantKey, transaction.amount);
    } else {
      baselineTransactionCount += 1;
      addRollup(baselineCategoryRollups, categoryKey, transaction.amount);
      addRollup(baselineMerchantRollups, merchantKey, transaction.amount);
    }

    if (transaction.categoryId) {
      const categoryCounts = merchantCategoryIds.get(merchantKey) ?? new Map();
      categoryCounts.set(
        transaction.categoryId,
        (categoryCounts.get(transaction.categoryId) ?? 0) + 1
      );
      merchantCategoryIds.set(merchantKey, categoryCounts);
    }
  }

  const baselineLookbackDays = daysBetween(
    params.transactions
      .map((transaction) => transaction.transactionDate)
      .sort()[0] ?? params.periodStartDate,
    params.periodStartDate
  );
  const baselineScale = monthScaleFactor(baselineLookbackDays);

  const categorySignals = params.categories
    .map((category) => {
      const current = getRollup(currentCategoryRollups, category.categoryId);
      const baseline = getRollup(baselineCategoryRollups, category.categoryId);
      const baselineMonthlySpend =
        baselineScale > 0 ? baseline.spend / baselineScale : 0;
      const baselineMonthlyCount =
        baselineScale > 0 ? baseline.count / baselineScale : 0;

      return {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        currentMonthSpend: roundCurrency(current.spend),
        currentMonthTransactionCount: current.count,
        baselineMonthlyAverageSpend: roundCurrency(baselineMonthlySpend),
        baselineMonthlyAverageTransactionCount: roundCount(baselineMonthlyCount),
        spendDeltaVsBaseline: roundCurrency(current.spend - baselineMonthlySpend),
        projectedVarianceAmount: category.projectedVarianceAmount,
        plannedBudgetAmount: category.plannedBudgetAmount,
      };
    })
    .filter(
      (category) =>
        category.currentMonthSpend > 0 ||
        category.baselineMonthlyAverageSpend > 0 ||
        category.projectedVarianceAmount !== 0
    )
    .sort(compareAbsoluteDelta)
    .slice(0, 10);

  const merchantSignals = Array.from(
    new Set([
      ...Array.from(currentMerchantRollups.keys()),
      ...Array.from(baselineMerchantRollups.keys()),
    ])
  )
    .map((merchantName) => {
      const current = getRollup(currentMerchantRollups, merchantName);
      const baseline = getRollup(baselineMerchantRollups, merchantName);
      const baselineMonthlySpend =
        baselineScale > 0 ? baseline.spend / baselineScale : 0;
      const baselineMonthlyCount =
        baselineScale > 0 ? baseline.count / baselineScale : 0;
      const categoryCounts = merchantCategoryIds.get(merchantName);
      const topCategoryId = categoryCounts
        ? Array.from(categoryCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0]
        : null;

      return {
        merchantName,
        currentMonthSpend: roundCurrency(current.spend),
        currentMonthTransactionCount: current.count,
        baselineMonthlyAverageSpend: roundCurrency(baselineMonthlySpend),
        baselineMonthlyAverageTransactionCount: roundCount(baselineMonthlyCount),
        spendDeltaVsBaseline: roundCurrency(current.spend - baselineMonthlySpend),
        categoryName: topCategoryId
          ? categoryById.get(topCategoryId)?.categoryName ?? null
          : null,
      };
    })
    .filter(
      (merchant) =>
        merchant.currentMonthSpend > 0 || merchant.baselineMonthlyAverageSpend > 0
    );

  const recurringMerchantCandidates = merchantSignals
    .filter(
      (merchant) =>
        merchant.currentMonthTransactionCount > 0 &&
        merchant.baselineMonthlyAverageTransactionCount >= 1
    )
    .sort(compareCurrentSpend)
    .slice(0, 6);

  const recentLargeTransactions = merchantSignals
    .filter((merchant) => merchant.currentMonthSpend >= 75)
    .sort(compareCurrentSpend)
    .slice(0, 6);

  return {
    asOfDate: params.asOfDate,
    question: params.question,
    period: {
      periodStartDate: params.periodStartDate,
      daysElapsed: params.daysElapsed,
      totalDaysInPeriod: params.totalDaysInPeriod,
      monthProgressPercent: Math.round(
        (params.daysElapsed / Math.max(1, params.totalDaysInPeriod)) * 100
      ),
      baselineLookbackDays,
    },
    budgetHealth: params.budgetHealth,
    categorySignals,
    merchantSignals: merchantSignals.sort(compareAbsoluteDelta).slice(0, 12),
    recurringMerchantCandidates,
    recentLargeTransactions,
    caveats: buildCaveats({
      currentTransactionCount,
      baselineTransactionCount,
      daysElapsed: params.daysElapsed,
      totalDaysInPeriod: params.totalDaysInPeriod,
    }),
  };
}
