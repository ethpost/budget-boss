import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  createSupabaseAnonClient,
} from "../../../../lib/auth/server-auth";

function getCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;

  const entry = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`));

  if (!entry) return null;

  return decodeURIComponent(entry.slice(cookieName.length + 1));
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const accessToken = getCookieValue(cookieHeader, AUTH_ACCESS_COOKIE_NAME);
  const refreshToken = getCookieValue(cookieHeader, AUTH_REFRESH_COOKIE_NAME);
  const supabase = createSupabaseAnonClient();
  const { data, error } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : { data: { user: null }, error: null };

  return NextResponse.json({
    hasAccessCookie: Boolean(accessToken),
    hasRefreshCookie: Boolean(refreshToken),
    accessTokenValid: Boolean(data.user) && !error,
    accessTokenError: error?.message ?? null,
  });
}
