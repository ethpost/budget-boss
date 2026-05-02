import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
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

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearAuthCookies(response);

  return response;
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/", request.url));
}
