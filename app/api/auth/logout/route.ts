import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
} from "../../../../lib/auth/server-auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
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

  return response;
}
