import { NextResponse } from "next/server";
import { createPlaidClient } from "../../../../lib/transactions/providers/plaid/create-plaid-client";
import { exchangePublicTokenAndSync } from "../../../../lib/transactions/providers/plaid/exchange-public-token-and-sync";
import { upsertPlaidItemConnection } from "../../../../lib/transactions/repositories/upsert-plaid-item-connection";
import { requireRequestAuthSession } from "../../../../lib/auth/server-auth";

function getRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

export async function POST(request: Request) {
  try {
    const authSession = await requireRequestAuthSession(request).catch(() => null);
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const publicToken = getRequiredText(body.publicToken, "publicToken");

    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    if (!plaidClientId || !plaidSecret) {
      return NextResponse.json(
        { error: "Missing PLAID_CLIENT_ID or PLAID_SECRET." },
        { status: 500 }
      );
    }

    const supabase = authSession.supabase;
    const plaidClient = createPlaidClient({
      clientId: plaidClientId,
      secret: plaidSecret,
      environment: process.env.PLAID_ENV,
    });

    const resolvedUserId = authSession.user.id;

    const result = await exchangePublicTokenAndSync({
      plaidClient,
      supabase,
      userId: resolvedUserId,
      publicToken,
    });

    await upsertPlaidItemConnection({
      supabase,
      userId: resolvedUserId,
      itemId: result.itemId,
      accessToken: result.accessToken,
      cursor: result.nextCursor,
      lastSyncAt: new Date().toISOString(),
    });

    return NextResponse.json({
      item_id: result.itemId,
      fetchedCount: result.fetchedCount,
      importedCount: result.importedCount,
      removedCount: result.removedCount,
      skippedPendingCount: result.skippedPendingCount,
      upsertedCount: result.upsertedCount,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to exchange public token.",
      },
      { status: 500 }
    );
  }
}
