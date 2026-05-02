"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

async function readErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
  return typeof payload.error === "string" && payload.error.trim().length > 0
    ? payload.error
    : "Authentication failed.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const nextPath = searchParams.get("next") ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, mode, next: nextPath }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json().catch(() => ({}))) as { next?: unknown };
      const destination =
        typeof payload.next === "string" && payload.next.startsWith("/")
          ? payload.next
          : nextPath;

      router.replace(destination);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setStatus((current) => (current === "error" ? "error" : "idle"));
    }
  }

  return (
    <form className="authForm" onSubmit={handleSubmit}>
      <div className="authToggle" aria-label="Authentication mode">
        <button
          className={mode === "sign_in" ? "authToggleButton isActive" : "authToggleButton"}
          type="button"
          onClick={() => setMode("sign_in")}
        >
          Sign in
        </button>
        <button
          className={mode === "sign_up" ? "authToggleButton isActive" : "authToggleButton"}
          type="button"
          onClick={() => setMode("sign_up")}
        >
          Create account
        </button>
      </div>

      <label className="authField">
        <span className="authLabel">Email</span>
        <input
          className="authInput"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="authField">
        <span className="authLabel">Password</span>
        <input
          className="authInput"
          name="password"
          type="password"
          autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <button className="authButton" type="submit" disabled={status === "submitting"}>
        {status === "submitting"
          ? "Working..."
          : mode === "sign_in"
            ? "Sign in"
            : "Create account"}
      </button>
      {message ? <p className="authError">{message}</p> : null}
    </form>
  );
}
