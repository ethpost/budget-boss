import { NextResponse } from "next/server";
import { requireRequestAuthSession } from "../../../../lib/auth/server-auth";
import { getActiveCategories } from "../../../../lib/budget-setup/repositories/get-active-categories";
import { assignTransactionCategory } from "../../../../lib/transactions/repositories/assign-transaction-category";

function getRequiredText(value: FormDataEntryValue | null, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

export async function POST(request: Request) {
  const authSession = await requireRequestAuthSession(request).catch(() => null);
  if (!authSession) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const categoryId = getRequiredText(formData.get("categoryId"), "categoryId");
    const sourceTransactionIds = formData
      .getAll("sourceTransactionId")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    const activeCategories = await getActiveCategories(
      authSession.supabase,
      authSession.user.id
    );
    const categoryIsAllowed = activeCategories.some(
      (category) => category.categoryId === categoryId
    );

    if (!categoryIsAllowed) {
      throw new Error("Selected category is not available for this user.");
    }

    await assignTransactionCategory({
      supabase: authSession.supabase,
      userId: authSession.user.id,
      source: "plaid",
      categoryId,
      sourceTransactionIds,
    });

    return NextResponse.redirect(new URL("/transactions?saved=1", request.url), {
      status: 303,
    });
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/transactions?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Failed to categorize transactions."
        )}`,
        request.url
      ),
      { status: 303 }
    );
  }
}
