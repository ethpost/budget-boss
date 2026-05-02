import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
} from "../../../../lib/auth/server-auth";

function hasCookie(cookieHeader: string | null, cookieName: string): boolean {
  if (!cookieHeader) return false;

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .some((entry) => entry.startsWith(`${cookieName}=`));
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  return NextResponse.json({
    hasAccessCookie: hasCookie(cookieHeader, AUTH_ACCESS_COOKIE_NAME),
    hasRefreshCookie: hasCookie(cookieHeader, AUTH_REFRESH_COOKIE_NAME),
  });
}
