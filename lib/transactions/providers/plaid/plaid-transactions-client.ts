import { type PlaidTransactionInput } from "../../adapters/plaid/normalize-plaid-transactions";

export type PlaidTransactionsSyncRequest = {
  access_token: string;
  cursor?: string | null;
  count?: number;
};

export interface PlaidTransactionsClient {
  transactionsSync(
    request: PlaidTransactionsSyncRequest
  ): Promise<{
    data: PlaidTransactionsSyncResponse;
  }>;
}

export type PlaidTransactionRemoved = {
  transaction_id: string;
};

export type PlaidTransactionsSyncResponse = {
  added: PlaidTransactionInput[];
  modified: PlaidTransactionInput[];
  removed: PlaidTransactionRemoved[];
  next_cursor: string | null;
  has_more: boolean;
};
