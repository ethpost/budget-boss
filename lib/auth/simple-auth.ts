import crypto from "node:crypto";

export const AUTH_COOKIE_NAME = "budget_boss_auth";
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type AuthConfig = {
  username: string;
  password: string;
  secret: string;
};

export type AuthSession = {
  username: string;
  expiresAt: number;
};

function getSecret(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    null
  );
}

export function getAuthConfig(): AuthConfig | null {
  const username = process.env.BUDGET_BOSS_AUTH_USERNAME;
  const password = process.env.BUDGET_BOSS_AUTH_PASSWORD;
  const secret = getSecret();

  if (
    !username ||
    username.trim().length === 0 ||
    !password ||
    password.trim().length === 0 ||
    !secret
  ) {
    return null;
  }

  return {
    username: username.trim(),
    password,
    secret,
  };
}

export function isAuthConfigured(): boolean {
  return getAuthConfig() !== null;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAuthSessionToken(params: {
  username: string;
  secret: string;
  ttlSeconds?: number;
}): string {
  const expiresAt = Date.now() + (params.ttlSeconds ?? AUTH_SESSION_TTL_SECONDS) * 1000;
  const payload = JSON.stringify({
    username: params.username,
    expiresAt,
  });
  const payloadPart = base64UrlEncode(payload);
  const signature = createSignature(payloadPart, params.secret);

  return `${payloadPart}.${signature}`;
}

export function verifyAuthSessionToken(token: string | undefined): AuthSession | null {
  if (!token) {
    return null;
  }

  const dotIndex = token.indexOf(".");
  if (dotIndex <= 0 || dotIndex >= token.length - 1) {
    return null;
  }

  const payloadPart = token.slice(0, dotIndex);
  const signaturePart = token.slice(dotIndex + 1);
  const config = getAuthConfig();

  if (!config) {
    return null;
  }

  const expectedSignature = createSignature(payloadPart, config.secret);
  if (!safeEquals(signaturePart, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as Partial<AuthSession>;
    if (
      typeof payload.username !== "string" ||
      payload.username.trim().length === 0 ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt)
    ) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return {
      username: payload.username.trim(),
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export function authenticateWithCredentials(params: {
  username: string;
  password: string;
}): AuthSession | null {
  const config = getAuthConfig();
  if (!config) {
    return null;
  }

  if (params.username !== config.username || params.password !== config.password) {
    return null;
  }

  return {
    username: config.username,
    expiresAt: Date.now() + AUTH_SESSION_TTL_SECONDS * 1000,
  };
}

export function createAuthSessionCookieValue(session: AuthSession): string {
  const config = getAuthConfig();
  if (!config) {
    return "";
  }

  const payload = JSON.stringify(session);
  const payloadPart = base64UrlEncode(payload);
  const signature = createSignature(payloadPart, config.secret);
  return `${payloadPart}.${signature}`;
}

export function getCookieValueFromHeader(
  cookieHeader: string | null,
  cookieName: string
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  for (const cookie of cookies) {
    const equalsIndex = cookie.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const name = cookie.slice(0, equalsIndex).trim();
    if (name !== cookieName) {
      continue;
    }

    return cookie.slice(equalsIndex + 1).trim();
  }

  return null;
}

export function normalizeNextPath(value: unknown): string {
  if (typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return "/";
  }

  return trimmed;
}
