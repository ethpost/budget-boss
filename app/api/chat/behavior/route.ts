import { NextResponse } from "next/server";
import { requireRequestAuthSession } from "../../../../lib/auth/server-auth";
import { buildBuyingBehaviorEvidence } from "../../../../lib/budget-health/domain/build-buying-behavior-evidence";
import { loadBudgetHealthDashboard } from "../../../../lib/budget-health/server/load-budget-health-dashboard";
import { getBehaviorTransactions } from "../../../../lib/transactions/repositories/get-behavior-transactions";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function getRequiredQuestion(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Question is required.");
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Question is required.");
  }

  if (trimmed.length > 800) {
    throw new Error("Question must be 800 characters or fewer.");
  }

  return trimmed;
}

function subtractDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function extractOutputText(response: OpenAIResponse): string | null {
  if (response.output_text && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();

  return text && text.length > 0 ? text : null;
}

function buildInstructions(): string {
  return [
    "You are Budget Boss, a private budgeting assistant focused on buying behavior.",
    "Answer the user's plain-language question using only the supplied evidence JSON.",
    "Do not invent amounts, merchants, categories, dates, balances, account details, or transactions.",
    "Do not answer affordability or cash-flow questions from account balances.",
    "You may reason about behavior: frequency changes, merchant concentration, category shifts, recurring spend, and budget pacing.",
    "Be thoughtful and specific. If two explanations compete, compare them instead of forcing one answer.",
    "Call out uncertainty when evidence is thin, early in the month, uncategorized, or directional.",
    "Keep the answer concise: 2 to 5 short paragraphs, no markdown tables.",
  ].join("\n");
}

async function generateGroundedAnswer(params: {
  question: string;
  evidence: unknown;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: buildInstructions(),
      input: JSON.stringify(
        {
          question: params.question,
          evidence: params.evidence,
        },
        null,
        2
      ),
      max_output_tokens: 800,
      store: false,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `OpenAI request failed with ${response.status}.`
    );
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI did not return an answer.");
  }

  return outputText;
}

export async function POST(request: Request) {
  const authSession = await requireRequestAuthSession(request).catch(() => null);
  if (!authSession) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      question?: unknown;
    };
    const question = getRequiredQuestion(body.question);
    const state = await loadBudgetHealthDashboard(authSession.supabase);

    if (state.status !== "ready") {
      return NextResponse.json(
        { error: "Budget Health is not ready for grounded chat yet." },
        { status: 409 }
      );
    }

    const baselineStartDate = subtractDays(state.result.period.periodStartDate, 90);
    const transactions = await getBehaviorTransactions({
      supabase: authSession.supabase,
      userId: authSession.user.id,
      startDate: baselineStartDate,
      endDate: state.asOfDate,
      source: "plaid",
      limit: 1200,
    });
    const primaryDriverCategoryName =
      state.result.categories.find(
        (category) =>
          category.categoryId === state.result.explanation.primaryDriverCategoryId
      )?.categoryName ?? null;
    const evidence = buildBuyingBehaviorEvidence({
      question,
      asOfDate: state.asOfDate,
      periodStartDate: state.result.period.periodStartDate,
      daysElapsed: state.result.period.daysElapsed,
      totalDaysInPeriod: state.result.period.totalDaysInPeriod,
      budgetHealth: {
        score: state.result.totals.budgetHealthScore,
        status: state.result.totals.budgetHealthStatus,
        projectedMonthEndVariance:
          state.result.totals.projectedMonthEndVariance,
        plannedBudgetAmount: state.result.totals.plannedBudgetAmount,
        actualSpendToDate: state.result.totals.actualSpendToDate,
        summary: state.result.explanation.summary,
        confidence: state.result.explanation.confidence,
        primaryDriverCategoryName,
      },
      categories: state.result.categories.map((category) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        plannedBudgetAmount: category.plannedBudgetAmount,
        actualSpendToDate: category.actualSpendToDate,
        projectedVarianceAmount: category.projectedVarianceAmount,
      })),
      transactions,
    });
    const answer = await generateGroundedAnswer({ question, evidence });

    return NextResponse.json({ answer, evidence });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to answer the behavior question.",
      },
      { status: 500 }
    );
  }
}
