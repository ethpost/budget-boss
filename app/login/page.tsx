import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "../components/login-form";
import { isAuthConfigured, verifyAuthSessionToken, AUTH_COOKIE_NAME } from "../../lib/auth/simple-auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

function normalizeSearchParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? "/";
  }

  return typeof value === "string" && value.startsWith("/") ? value : "/";
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = normalizeSearchParam(params.next);
  const cookieStore = await cookies();
  const session = verifyAuthSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (session) {
    redirect(nextPath);
  }

  const authConfigured = isAuthConfigured();

  return (
    <main className="screen authScreen">
      <section className="authCard">
        <div className="authBrand">
          <div className="shellMark">BB</div>
          <div>
            <p className="shellKicker">Budget Boss</p>
            <p className="shellTitle">Sign in</p>
          </div>
        </div>

        <h1 className="title title--auth">Simple username/password auth.</h1>
        <p className="lede">
          Sign in to access the budgeting app, Plaid settings, and budget setup.
        </p>

        {authConfigured ? (
          <LoginForm />
        ) : (
          <div className="panel panel--auth">
            <p className="value">Auth is not configured yet.</p>
            <p className="subvalue">
              Set <code>BUDGET_BOSS_AUTH_USERNAME</code> and{" "}
              <code>BUDGET_BOSS_AUTH_PASSWORD</code> in your runtime environment, then
              redeploy.
            </p>
          </div>
        )}

        <div className="authFooter">
          <Link className="shellLink" href="/">
            Back to app
          </Link>
          <Link className="shellLink" href="/settings">
            Settings
          </Link>
        </div>
      </section>
    </main>
  );
}
