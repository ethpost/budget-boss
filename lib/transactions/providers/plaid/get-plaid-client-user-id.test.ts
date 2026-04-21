import { describe, expect, it } from "vitest";
import { getPlaidClientUserId } from "./get-plaid-client-user-id";

describe("getPlaidClientUserId", () => {
  it("prefers an explicit clientUserId or userId", () => {
    expect(getPlaidClientUserId({ clientUserId: " client-a " })).toBe("client-a");
    expect(getPlaidClientUserId({ userId: " user-b " })).toBe("user-b");
  });

  it("falls back to the configured default", () => {
    const original = process.env.PLAID_CLIENT_USER_ID;
    process.env.PLAID_CLIENT_USER_ID = "  dev-user  ";

    try {
      expect(getPlaidClientUserId({})).toBe("dev-user");
      expect(getPlaidClientUserId(null)).toBe("dev-user");
    } finally {
      if (original === undefined) {
        delete process.env.PLAID_CLIENT_USER_ID;
      } else {
        process.env.PLAID_CLIENT_USER_ID = original;
      }
    }
  });

  it("uses the built-in demo user when no env override exists", () => {
    const original = process.env.PLAID_CLIENT_USER_ID;
    delete process.env.PLAID_CLIENT_USER_ID;

    try {
      expect(getPlaidClientUserId(undefined)).toBe("budget-boss-demo-user");
    } finally {
      if (original === undefined) {
        delete process.env.PLAID_CLIENT_USER_ID;
      } else {
        process.env.PLAID_CLIENT_USER_ID = original;
      }
    }
  });
});
