import { afterEach, describe, expect, it } from "vitest";
import {
  authenticateWithCredentials,
  createAuthSessionCookieValue,
  createAuthSessionToken,
  getCookieValueFromHeader,
  normalizeNextPath,
  verifyAuthSessionToken,
} from "./simple-auth";

function setAuthEnv() {
  process.env.BUDGET_BOSS_AUTH_USERNAME = "alpha";
  process.env.BUDGET_BOSS_AUTH_PASSWORD = "beta";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-123";
}

afterEach(() => {
  delete process.env.BUDGET_BOSS_AUTH_USERNAME;
  delete process.env.BUDGET_BOSS_AUTH_PASSWORD;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
});

describe("simple auth", () => {
  it("authenticates credentials and signs a cookie", () => {
    setAuthEnv();

    const session = authenticateWithCredentials({
      username: "alpha",
      password: "beta",
    });

    expect(session?.username).toBe("alpha");
    const cookie = session ? createAuthSessionCookieValue(session) : "";
    expect(cookie).toContain(".");
    expect(verifyAuthSessionToken(cookie)?.username).toBe("alpha");
  });

  it("rejects invalid credentials", () => {
    setAuthEnv();

    expect(
      authenticateWithCredentials({
        username: "alpha",
        password: "wrong",
      })
    ).toBeNull();
  });

  it("rejects expired or tampered cookies", () => {
    setAuthEnv();

    const token = createAuthSessionToken({
      username: "alpha",
      secret: "secret-123",
      ttlSeconds: -1,
    });
    expect(verifyAuthSessionToken(token)).toBeNull();
    expect(verifyAuthSessionToken(`${token}x`)).toBeNull();
  });

  it("normalizes next paths", () => {
    expect(normalizeNextPath("/budget")).toBe("/budget");
    expect(normalizeNextPath("https://example.com")).toBe("/");
    expect(normalizeNextPath(undefined)).toBe("/");
  });

  it("extracts cookie values from a cookie header", () => {
    expect(
      getCookieValueFromHeader("foo=bar; budget_boss_auth=session123; baz=qux", "budget_boss_auth")
    ).toBe("session123");
    expect(getCookieValueFromHeader(null, "budget_boss_auth")).toBeNull();
  });
});
