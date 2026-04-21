import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createPlaidClient } from "../lib/transactions/providers/plaid/create-plaid-client";
import { syncPlaidTransactions } from "../lib/transactions/providers/plaid/sync-plaid-transactions";

function printUsage(): never {
  throw new Error(
    "Usage: npm run sync:plaid-transactions -- --user-id <uuid> --access-token <token> [--cursor <cursor>] [--page-size N]"
  );
}

function getArgValue(name: string): string | null {
  const args = process.argv.slice(3);
  const index = args.indexOf(name);
  if (index === -1) return null;

  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

function getArgNumber(name: string): number | null {
  const value = getArgValue(name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function main() {
  const userId = getArgValue("--user-id");
  const accessToken = getArgValue("--access-token");
  const cursor = getArgValue("--cursor");
  const pageSize = getArgNumber("--page-size") ?? 500;

  if (!userId || !accessToken) {
    printUsage();
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const plaidClientId = process.env.PLAID_CLIENT_ID;
  const plaidSecret = process.env.PLAID_SECRET;

  if (!plaidClientId || !plaidSecret) {
    throw new Error("Missing PLAID_CLIENT_ID or PLAID_SECRET.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const plaidClient = createPlaidClient({
    clientId: plaidClientId,
    secret: plaidSecret,
    environment: process.env.PLAID_ENV,
  });

  const result = await syncPlaidTransactions({
    plaidClient,
    supabase,
    userId,
    accessToken,
    cursor,
    pageSize,
  });

  console.log(JSON.stringify({ cursor: cursor ?? null, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
