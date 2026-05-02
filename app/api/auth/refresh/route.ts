import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  AUTH_REFRESH_TTL_SECONDS,
  createSupabaseAnonClient,
  getAuthRefreshCookieFromHeader,
  normalizeNextPath,
} from "../../../../lib/auth/server-auth";

function clearAuthCookies(response: NextResponse): void {
  for (const cookieName of [AUTH_ACCESS_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME]) {
    response.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
}

function setAuthCookies(
  response: NextResponse,
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }
): void {
  response.cookies.set({
    name: AUTH_ACCESS_COOKIE_NAME,
    value: session.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.expires_in,
  });
  response.cookies.set({
    name: AUTH_REFRESH_COOKIE_NAME,
    value: session.refresh_token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_REFRESH_TTL_SECONDS,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = normalizeNextPath(url.searchParams.get("next"));
  const refreshToken = getAuthRefreshCookieFromHeader(
    request.headers.get("cookie")
  );

  if (!refreshToken) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(nextPath)}`, request.url)
    );
  }

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    const response = NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(nextPath)}`, request.url)
    );
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  setAuthCookies(response, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  });
  return response;
}
