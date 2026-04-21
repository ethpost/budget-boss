import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPlaidClient } from "../../../../lib/transactions/providers/plaid/create-plaid-client";
import { exchangePublicTokenAndSync } from "../../../../lib/transactions/providers/plaid/exchange-public-token-and-sync";
import { getBudgetOwnerUserId } from "../../../../lib/budget-setup/repositories/get-budget-owner-user-id";
import { upsertPlaidItemConnection } from "../../../../lib/transactions/repositories/upsert-plaid-item-connection";
import {
  AUTH_COOKIE_NAME,
  getCookieValueFromHeader,
  isAuthConfigured,
  verifyAuthSessionToken,
} from "../../../../lib/auth/simple-auth";

function getRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authCookieValue = getCookieValueFromHeader(
      request.headers.get("cookie"),
      AUTH_COOKIE_NAME
    );
    if (isAuthConfigured() && !verifyAuthSessionToken(authCookieValue ?? undefined)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const publicToken = getRequiredText(body.publicToken, "publicToken");

    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration." },
        { status: 500 }
      );
    }

    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    if (!plaidClientId || !plaidSecret) {
      return NextResponse.json(
        { error: "Missing PLAID_CLIENT_ID or PLAID_SECRET." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const plaidClient = createPlaidClient({
      clientId: plaidClientId,
      secret: plaidSecret,
      environment: process.env.PLAID_ENV,
    });

    const explicitUserId =
      typeof body.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : typeof body.clientUserId === "string" && body.clientUserId.trim().length > 0
          ? body.clientUserId.trim()
          : null;
    const resolvedUserId = explicitUserId ?? (await getBudgetOwnerUserId(supabase));

    if (!resolvedUserId) {
      return NextResponse.json(
        { error: "Unable to resolve a budget owner user id." },
        { status: 500 }
      );
    }

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
