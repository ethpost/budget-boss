import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  prepareTransactionUpsertRows,
  type BankFeedTransactionInput,
} from "../lib/transactions/domain/prepare-transaction-import";
import { upsertTransactions } from "../lib/transactions/repositories/upsert-transactions";

function printUsage(): never {
  throw new Error(
    "Usage: npm run import:transactions -- --user-id <uuid> --input <path-to-json>"
  );
}

function getArgValue(name: string): string | null {
  const args = process.argv.slice(3);
  const index = args.indexOf(name);
  if (index === -1) return null;

  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

async function main() {
  const userId = getArgValue("--user-id");
  const inputPath = getArgValue("--input");

  if (!userId || !inputPath) {
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

  const filePath = path.resolve(process.cwd(), inputPath);
  const fileContents = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(fileContents) as BankFeedTransactionInput[];

  if (!Array.isArray(parsed)) {
    throw new Error("Input JSON must be an array of transactions.");
  }

  const rows = prepareTransactionUpsertRows({
    userId,
    transactions: parsed,
  });

  const supabase = createClient(supabaseUrl, supabaseKey);
  const result = await upsertTransactions(supabase, rows);

  console.log(
    JSON.stringify(
      {
        importedCount: rows.length,
        upsertedCount: result.upsertedCount,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
