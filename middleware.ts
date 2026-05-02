import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  AUTH_REFRESH_TTL_SECONDS,
  createSupabaseAnonClient,
} from "./lib/auth/server-auth";

const PROTECTED_PAGE_PATHS = ["/", "/budget", "/chat", "/settings"];
const PROTECTED_API_PATHS = [
  "/api/budget/setup",
  "/api/plaid/link-token",
  "/api/plaid/exchange-public-token",
];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PATHS.includes(pathname);
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PATHS.includes(pathname);
}

function buildLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(loginUrl);
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

async function hasValidAccessToken(accessToken: string | undefined): Promise<boolean> {
  if (!accessToken) return false;

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  return !error && Boolean(data.user);
}

async function refreshAuthSession(
  refreshToken: string | undefined
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  if (!refreshToken) return null;

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return null;
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPage = isProtectedPage(pathname);
  const protectedApi = isProtectedApi(pathname);

  if (!protectedPage && !protectedApi && pathname !== "/login") {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value;

  if (await hasValidAccessToken(accessToken)) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  const refreshedSession = await refreshAuthSession(refreshToken);
  if (refreshedSession) {
    const response =
      pathname === "/login"
        ? NextResponse.redirect(new URL("/", request.url))
        : NextResponse.next();
    setAuthCookies(response, refreshedSession);
    return response;
  }

  if (protectedApi) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (protectedPage) {
    return buildLoginRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/budget",
    "/chat",
    "/settings",
    "/login",
    "/api/budget/setup",
    "/api/plaid/link-token",
    "/api/plaid/exchange-public-token",
  ],
};
