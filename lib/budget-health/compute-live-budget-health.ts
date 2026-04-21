// lib/budget-health/compute-live-budget-health.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { getPeriodContext } from "./domain/get-period-context";
import { getHistoricalContextWindow } from "./domain/get-historical-context-window";
import { buildHistoricalContext } from "./domain/build-historical-context";
import {
  buildBudgetHealthExplanation,
  BudgetHealthExplanation,
  BudgetHealthHistoricalContextDetails,
} from "./domain/build-budget-health-explanation";
import {
  getActiveCategoryBudgets,
  CategoryBehaviorType,
} from "./repositories/get-active-category-budgets";
import { getActualSpendToDateByCategory } from "./repositories/get-actual-spend-to-date-by-category";
import { getHistoricalTransactionHistory } from "./repositories/get-historical-transaction-history";

export type LiveBudgetHealthCategory = {
  categoryId: string;
  categoryName: string;
  categoryBehaviorType: CategoryBehaviorType;
  plannedBudgetAmount: number;
  actualSpendToDate: number;
  forecastRemainingSpend: number;
  projectedFinalSpend: number;
  projectedVarianceAmount: number;
};

export type BudgetHealthStatus = "under_plan" | "on_plan" | "over_plan";

export type ComputeLiveBudgetHealthResult = {
  period: {
    asOfDate: string;
    periodStartDate: string;
    periodEndDate: string;
    daysElapsed: number;
    daysRemaining: number;
    totalDaysInPeriod: number;
    elapsedFraction: number;
  };
  totals: {
    plannedBudgetAmount: number;
    actualSpendToDate: number;
    forecastRemainingSpend: number;
    projectedFinalSpend: number;
    projectedMonthEndVariance: number;
    budgetHealthScore: number;
    budgetHealthStatus: BudgetHealthStatus;
  };
  categories: LiveBudgetHealthCategory[];
  explanation: BudgetHealthExplanation;
  meta: {
    modelVersion: string;
    computedAt: string;
  };
};

type ComputeLiveBudgetHealthParams = {
  supabase: SupabaseClient;
  asOfDate: string;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function computeBudgetHealthScore(
  projectedMonthEndVariance: number,
  plannedBudgetAmount: number
): number {
  if (plannedBudgetAmount <= 0) return 0;

  const normalizedVariance = projectedMonthEndVariance / plannedBudgetAmount;
  const k = 0.25;

  return roundScore(Math.tanh(normalizedVariance / k));
}

function computeBudgetHealthStatus(
  projectedMonthEndVariance: number,
  plannedBudgetAmount: number
): BudgetHealthStatus {
  const tolerance = Math.max(50, plannedBudgetAmount * 0.02);

  if (projectedMonthEndVariance < -tolerance) return "under_plan";
  if (projectedMonthEndVariance > tolerance) return "over_plan";
  return "on_plan";
}

function forecastCategory(params: {
  categoryBehaviorType: CategoryBehaviorType;
  plannedBudgetAmount: number;
  actualSpendToDate: number;
  elapsedFraction: number;
}): Pick<
  LiveBudgetHealthCategory,
  "forecastRemainingSpend" | "projectedFinalSpend" | "projectedVarianceAmount"
> {
  const {
    categoryBehaviorType,
    plannedBudgetAmount,
    actualSpendToDate,
    elapsedFraction,
  } = params;

  if (categoryBehaviorType === "fixed") {
    const forecastRemainingSpend = Math.max(
      plannedBudgetAmount - actualSpendToDate,
      0
    );
    const projectedFinalSpend = actualSpendToDate + forecastRemainingSpend;
    const projectedVarianceAmount = projectedFinalSpend - plannedBudgetAmount;

    return {
      forecastRemainingSpend: roundCurrency(forecastRemainingSpend),
      projectedFinalSpend: roundCurrency(projectedFinalSpend),
      projectedVarianceAmount: roundCurrency(projectedVarianceAmount),
    };
  }

  if (elapsedFraction <= 0) {
    return {
      forecastRemainingSpend: roundCurrency(plannedBudgetAmount),
      projectedFinalSpend: roundCurrency(plannedBudgetAmount),
      projectedVarianceAmount: 0,
    };
  }

  const projectedFinalSpend = actualSpendToDate / elapsedFraction;
  const forecastRemainingSpend = Math.max(
    projectedFinalSpend - actualSpendToDate,
    0
  );
  const projectedVarianceAmount = projectedFinalSpend - plannedBudgetAmount;

  return {
    forecastRemainingSpend: roundCurrency(forecastRemainingSpend),
    projectedFinalSpend: roundCurrency(projectedFinalSpend),
    projectedVarianceAmount: roundCurrency(projectedVarianceAmount),
  };
}

export async function computeLiveBudgetHealth({
  supabase,
  asOfDate,
}: ComputeLiveBudgetHealthParams): Promise<ComputeLiveBudgetHealthResult> {
  const period = getPeriodContext(asOfDate);
  const historicalContextWindow = getHistoricalContextWindow(asOfDate);

  const [budgetRows, spendRows] = await Promise.all([
    getActiveCategoryBudgets(supabase, asOfDate),
    getActualSpendToDateByCategory({
      supabase,
      periodStartDate: period.periodStartDate,
      asOfDate,
    }),
  ]);

  const spendByCategoryId = new Map(
    spendRows.map((row) => [row.categoryId, row.actualSpendToDate])
  );

  const categories: LiveBudgetHealthCategory[] = budgetRows.map((row) => {
    const actualSpendToDate = spendByCategoryId.get(row.categoryId) ?? 0;

    const forecast = forecastCategory({
      categoryBehaviorType: row.categoryBehaviorType,
      plannedBudgetAmount: row.plannedBudgetAmount,
      actualSpendToDate,
      elapsedFraction: period.elapsedFraction,
    });

    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryBehaviorType: row.categoryBehaviorType,
      plannedBudgetAmount: row.plannedBudgetAmount,
      actualSpendToDate,
      ...forecast,
    };
  });

  const totals = categories.reduce(
    (acc, category) => {
      acc.plannedBudgetAmount += category.plannedBudgetAmount;
      acc.actualSpendToDate += category.actualSpendToDate;
      acc.forecastRemainingSpend += category.forecastRemainingSpend;
      acc.projectedFinalSpend += category.projectedFinalSpend;
      acc.projectedMonthEndVariance += category.projectedVarianceAmount;
      return acc;
    },
    {
      plannedBudgetAmount: 0,
      actualSpendToDate: 0,
      forecastRemainingSpend: 0,
      projectedFinalSpend: 0,
      projectedMonthEndVariance: 0,
    }
  );

  totals.plannedBudgetAmount = roundCurrency(totals.plannedBudgetAmount);
  totals.actualSpendToDate = roundCurrency(totals.actualSpendToDate);
  totals.forecastRemainingSpend = roundCurrency(totals.forecastRemainingSpend);
  totals.projectedFinalSpend = roundCurrency(totals.projectedFinalSpend);
  totals.projectedMonthEndVariance = roundCurrency(
    totals.projectedMonthEndVariance
  );

  const budgetHealthScore = computeBudgetHealthScore(
    totals.projectedMonthEndVariance,
    totals.plannedBudgetAmount
  );

  const budgetHealthStatus = computeBudgetHealthStatus(
    totals.projectedMonthEndVariance,
    totals.plannedBudgetAmount
  );

  const baseExplanation = buildBudgetHealthExplanation({
    projectedMonthEndVariance: totals.projectedMonthEndVariance,
    plannedBudgetAmount: totals.plannedBudgetAmount,
    elapsedFraction: period.elapsedFraction,
    categories: categories.map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryBehaviorType: category.categoryBehaviorType,
      actualSpendToDate: category.actualSpendToDate,
      plannedBudgetAmount: category.plannedBudgetAmount,
      projectedVarianceAmount: category.projectedVarianceAmount,
    })),
    historicalContext: null,
  });

  let historicalContext: BudgetHealthExplanation["historicalContext"] = null;
  let historicalContextDetails: BudgetHealthHistoricalContextDetails | null =
    null;
  const primaryDriverCategoryId = baseExplanation.primaryDriverCategoryId;

  if (primaryDriverCategoryId) {
    const primaryDriverCategory = categories.find(
      (category) => category.categoryId === primaryDriverCategoryId
    );

    if (primaryDriverCategory) {
      const historicalRows = await getHistoricalTransactionHistory({
        supabase,
        categoryId: primaryDriverCategoryId,
        lookbackWindowStartDate:
          historicalContextWindow.lookbackWindowStartDate,
        lookbackWindowEndDate: historicalContextWindow.lookbackWindowEndDate,
      });

      const historicalContextResult = buildHistoricalContext({
        lookbackDays: historicalContextWindow.lookbackWindowDays,
        categoryId: primaryDriverCategory.categoryId,
        categoryName: primaryDriverCategory.categoryName,
        transactionRows: historicalRows,
      });

      if (historicalContextResult) {
        historicalContext = historicalContextResult.historicalContext;
        historicalContextDetails = historicalContextResult.details;
      }
    }
  }

  const explanation =
    historicalContext === null
      ? baseExplanation
      : buildBudgetHealthExplanation({
          projectedMonthEndVariance: totals.projectedMonthEndVariance,
          plannedBudgetAmount: totals.plannedBudgetAmount,
          elapsedFraction: period.elapsedFraction,
          categories: categories.map((category) => ({
            categoryId: category.categoryId,
            categoryName: category.categoryName,
            categoryBehaviorType: category.categoryBehaviorType,
            actualSpendToDate: category.actualSpendToDate,
            plannedBudgetAmount: category.plannedBudgetAmount,
            projectedVarianceAmount: category.projectedVarianceAmount,
          })),
          historicalContext,
          historicalContextDetails,
        });

  return {
    period,
    totals: {
      ...totals,
      budgetHealthScore,
      budgetHealthStatus,
    },
    categories,
    explanation,
    meta: {
      modelVersion: "v1",
      computedAt: new Date().toISOString(),
    },
  };
}
