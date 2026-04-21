import { describe, expect, it, vi } from "vitest";
import { createPlaidLinkToken } from "./create-plaid-link-token";

describe("createPlaidLinkToken", () => {
  it("creates a transactions link token", async () => {
    const linkTokenCreate = vi.fn().mockResolvedValue({
      data: {
        link_token: "link-sandbox-token",
      },
    });
    const plaidClient = { linkTokenCreate } as any;

    await expect(
      createPlaidLinkToken({
        plaidClient,
        clientUserId: "user-123",
        webhookUrl: "https://example.com/api/plaid/webhook",
      })
    ).resolves.toBe("link-sandbox-token");

    expect(linkTokenCreate).toHaveBeenCalledWith({
      client_name: "Budget Boss",
      language: "en",
      country_codes: ["US"],
      products: ["transactions"],
      webhook: "https://example.com/api/plaid/webhook",
      user: {
        client_user_id: "user-123",
      },
      transactions: {
        days_requested: 90,
      },
    });
  });
});
