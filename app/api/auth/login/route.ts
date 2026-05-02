import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  AUTH_REFRESH_TTL_SECONDS,
  normalizeNextPath,
} from "../../../../lib/auth/server-auth";

function getRequiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSupabaseLoginClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase URL or anon key.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = getRequiredText(body.email);
    const password = getRequiredText(body.password);
    const mode = getRequiredText(body.mode);
    const nextPath = normalizeNextPath(body.next);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseLoginClient();
    const authResult =
      mode === "sign_up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error.message },
        { status: 401 }
      );
    }

    if (!authResult.data.session) {
      return NextResponse.json(
        {
          error:
            "Supabase did not return a session. Check whether email confirmation is required.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true, next: nextPath });
    response.cookies.set({
      name: AUTH_ACCESS_COOKIE_NAME,
      value: authResult.data.session.access_token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: authResult.data.session.expires_in,
    });
    response.cookies.set({
      name: AUTH_REFRESH_COOKIE_NAME,
      value: authResult.data.session.refresh_token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_REFRESH_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sign in.",
      },
      { status: 500 }
    );
  }
}
