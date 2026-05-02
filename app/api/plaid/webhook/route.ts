import { NextResponse } from "next/server";
import { createPlaidClient } from "../../../../lib/transactions/providers/plaid/create-plaid-client";
import { handlePlaidTransactionsWebhook } from "../../../../lib/transactions/providers/plaid/handle-plaid-transactions-webhook";
import { createSupabaseServiceClient } from "../../../../lib/auth/server-auth";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing Supabase service role configuration." },
        { status: 500 }
      );
    }

    if (!plaidClientId || !plaidSecret) {
      return NextResponse.json(
        { error: "Missing PLAID_CLIENT_ID or PLAID_SECRET." },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const plaidClient = createPlaidClient({
      clientId: plaidClientId,
      secret: plaidSecret,
      environment: process.env.PLAID_ENV,
    });

    const result = await handlePlaidTransactionsWebhook({
      plaidClient,
      supabase,
      payload,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process webhook.",
      },
      { status: 500 }
    );
  }
}
