import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPlaidClient } from "../../../../lib/transactions/providers/plaid/create-plaid-client";
import { createPlaidLinkToken } from "../../../../lib/transactions/providers/plaid/create-plaid-link-token";
import { getBudgetOwnerUserId } from "../../../../lib/budget-setup/repositories/get-budget-owner-user-id";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const plaidClientId = process.env.PLAID_CLIENT_ID;
  const plaidSecret = process.env.PLAID_SECRET;

  if (!plaidClientId || !plaidSecret) {
    return NextResponse.json(
      { error: "Missing PLAID_CLIENT_ID or PLAID_SECRET." },
      { status: 500 }
    );
  }

  const plaidClient = createPlaidClient({
    clientId: plaidClientId,
    secret: plaidSecret,
    environment: process.env.PLAID_ENV,
  });

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

    const supabase = createClient(supabaseUrl, supabaseKey);
  const explicitUserId =
    typeof body.clientUserId === "string" && body.clientUserId.trim().length > 0
      ? body.clientUserId.trim()
      : typeof body.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : null;
    const clientUserId = explicitUserId ?? (await getBudgetOwnerUserId(supabase));

  if (!clientUserId) {
    return NextResponse.json(
      { error: "Unable to resolve a budget owner user id." },
      { status: 500 }
    );
  }

  try {
    const linkToken = await createPlaidLinkToken({
      plaidClient,
      clientUserId,
      webhookUrl: new URL("/api/plaid/webhook", request.url).toString(),
    });

    return NextResponse.json({ link_token: linkToken });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create link token.",
      },
      { status: 500 }
    );
  }
}
