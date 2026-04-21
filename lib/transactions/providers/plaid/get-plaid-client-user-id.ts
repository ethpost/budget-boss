export function getPlaidClientUserId(body: unknown): string {
  const candidate =
    typeof body === "object" && body !== null
      ? (body as {
          clientUserId?: unknown;
          userId?: unknown;
        }).clientUserId ??
        (body as {
          clientUserId?: unknown;
          userId?: unknown;
        }).userId
      : null;

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }

  const fallback = process.env.PLAID_CLIENT_USER_ID;
  if (typeof fallback === "string" && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return "budget-boss-demo-user";
}
