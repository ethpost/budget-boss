"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    return payload.error;
  }

  return fallback;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
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
        body: JSON.stringify({ username, password, next: nextPath }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Login failed."));
      }

      const payload = (await response.json().catch(() => ({}))) as { next?: unknown };
      const destination = typeof payload.next === "string" && payload.next.startsWith("/")
        ? payload.next
        : nextPath;

      router.replace(destination);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setStatus((current) => (current === "error" ? "error" : "idle"));
    }
  }

  return (
    <form className="authForm" onSubmit={handleSubmit}>
      <label className="authField">
        <span className="authLabel">Username</span>
        <input
          className="authInput"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>
      <label className="authField">
        <span className="authLabel">Password</span>
        <input
          className="authInput"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <input type="hidden" name="next" value={nextPath} />
      <button className="authButton" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Signing in..." : "Sign in"}
      </button>
      {message ? <p className="authError">{message}</p> : null}
    </form>
  );
}
