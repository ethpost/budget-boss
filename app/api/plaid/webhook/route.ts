import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createPlaidClient } from "../../../../lib/transactions/providers/plaid/create-plaid-client";
import { handlePlaidTransactionsWebhook } from "../../../../lib/transactions/providers/plaid/handle-plaid-transactions-webhook";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const plaidClientId = process.env.PLAID_CLIENT_ID;
    const plaidSecret = process.env.PLAID_SECRET;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration." },
        { status: 500 }
      );
    }

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
