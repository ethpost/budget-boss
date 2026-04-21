import { type PlaidApi, type LinkTokenCreateRequest } from "plaid";

export async function createPlaidLinkToken(params: {
  plaidClient: PlaidApi;
  clientUserId: string;
  webhookUrl?: string | null;
}) {
  const request: LinkTokenCreateRequest = {
    client_name: "Budget Boss",
    language: "en",
    country_codes: ["US"],
    products: ["transactions"],
    webhook: params.webhookUrl ?? undefined,
    user: {
      client_user_id: params.clientUserId,
    },
    transactions: {
      days_requested: 90,
    } as any,
  } as LinkTokenCreateRequest;

  const { data } = await params.plaidClient.linkTokenCreate(request);
  return data.link_token;
}
