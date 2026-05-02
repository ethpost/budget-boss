import { NextResponse } from "next/server";
import { createPlaidClient } from "../../../../lib/transactions/providers/plaid/create-plaid-client";
import { createPlaidLinkToken } from "../../../../lib/transactions/providers/plaid/create-plaid-link-token";
import { requireRequestAuthSession } from "../../../../lib/auth/server-auth";

export async function POST(request: Request) {
  const authSession = await requireRequestAuthSession(request).catch(() => null);
  if (!authSession) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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

  try {
    const linkToken = await createPlaidLinkToken({
      plaidClient,
      clientUserId: authSession.user.id,
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
