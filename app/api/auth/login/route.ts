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
    const contentType = request.headers.get("content-type") ?? "";
    const expectsJson = contentType.includes("application/json");
    const body = expectsJson
      ? await request.json().catch(() => ({}))
      : Object.fromEntries((await request.formData()).entries());
    const email = getRequiredText(body.email);
    const password = getRequiredText(body.password);
    const mode = getRequiredText(body.mode);
    const nextPath = normalizeNextPath(body.next);

    if (!email || !password) {
      if (expectsJson) {
        return NextResponse.json(
          { error: "Email and password are required." },
          { status: 400 }
        );
      }

      return NextResponse.redirect(
        new URL(
          `/login?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent(
            "Email and password are required."
          )}`,
          request.url
        ),
        { status: 303 }
      );
    }

    const supabase = getSupabaseLoginClient();
    const authResult =
      mode === "sign_up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (authResult.error) {
      if (expectsJson) {
        return NextResponse.json(
          { error: authResult.error.message },
          { status: 401 }
        );
      }

      return NextResponse.redirect(
        new URL(
          `/login?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent(
            authResult.error.message
          )}`,
          request.url
        ),
        { status: 303 }
      );
    }

    if (!authResult.data.session) {
      const message =
        "Supabase did not return a session. Check whether email confirmation is required.";
      if (expectsJson) {
        return NextResponse.json({ error: message }, { status: 401 });
      }

      return NextResponse.redirect(
        new URL(
          `/login?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent(
            message
          )}`,
          request.url
        ),
        { status: 303 }
      );
    }

    const response = expectsJson
      ? NextResponse.json({ ok: true, next: nextPath })
      : NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
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
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            error instanceof Error ? error.message : "Failed to sign in."
          )}`,
          request.url
        ),
        { status: 303 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sign in.",
      },
      { status: 500 }
    );
  }
}
