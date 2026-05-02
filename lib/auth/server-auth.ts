import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

export const AUTH_ACCESS_COOKIE_NAME = "budget_boss_supabase_access";
export const AUTH_REFRESH_COOKIE_NAME = "budget_boss_supabase_refresh";

export type ServerAuthSession = {
  user: User;
  accessToken: string;
  supabase: SupabaseClient;
};

function getSupabaseUrl(): string | null {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

function getSupabaseAnonKey(): string | null {
  return (
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    null
  );
}

export function createSupabaseUserClient(accessToken: string): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or service role key.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function getCookieValueFromHeader(
  cookieHeader: string | null,
  cookieName: string
): string | null {
  if (!cookieHeader) return null;

  const cookieEntries = cookieHeader.split(";").map((entry) => entry.trim());
  for (const entry of cookieEntries) {
    const equalsIndex = entry.indexOf("=");
    if (equalsIndex <= 0) continue;

    const name = entry.slice(0, equalsIndex);
    if (name !== cookieName) continue;

    return decodeURIComponent(entry.slice(equalsIndex + 1));
  }

  return null;
}

async function getSessionFromAccessToken(
  accessToken: string | null
): Promise<ServerAuthSession | null> {
  if (!accessToken) return null;

  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return {
    user: data.user,
    accessToken,
    supabase,
  };
}

export async function getPageAuthSession(): Promise<ServerAuthSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE_NAME)?.value ?? null;
  return getSessionFromAccessToken(accessToken);
}

export async function requirePageAuthSession(
  nextPath: string
): Promise<ServerAuthSession> {
  const session = await getPageAuthSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}

export async function getRequestAuthSession(
  request: Request
): Promise<ServerAuthSession | null> {
  const accessToken = getCookieValueFromHeader(
    request.headers.get("cookie"),
    AUTH_ACCESS_COOKIE_NAME
  );

  return getSessionFromAccessToken(accessToken);
}

export async function requireRequestAuthSession(
  request: Request
): Promise<ServerAuthSession> {
  const session = await getRequestAuthSession(request);

  if (!session) {
    throw new Error("Unauthorized.");
  }

  return session;
}

export function normalizeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  return trimmed;
}
