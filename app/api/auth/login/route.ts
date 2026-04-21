import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authenticateWithCredentials,
  createAuthSessionCookieValue,
  normalizeNextPath,
} from "../../../../lib/auth/simple-auth";

function getRequiredText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = getRequiredText(body.username);
    const password = getRequiredText(body.password);
    const nextPath = normalizeNextPath(body.next);
    const session = authenticateWithCredentials({ username, password });

    if (!session) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true, next: nextPath });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: createAuthSessionCookieValue(session),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to sign in." },
      { status: 500 }
    );
  }
}

