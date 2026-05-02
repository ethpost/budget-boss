import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "../components/login-form";
import { getPageAuthSession, normalizeNextPath } from "../../lib/auth/server-auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

function normalizeSearchParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return normalizeNextPath(value[0]);
  }

  return normalizeNextPath(value);
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = normalizeSearchParam(params.next);
  const errorMessage = Array.isArray(params.error)
    ? params.error[0] ?? null
    : params.error ?? null;
  const session = await getPageAuthSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="screen authScreen">
      <section className="authCard">
        <div className="authBrand">
          <div className="shellMark">BB</div>
          <div>
            <p className="shellKicker">Budget Boss</p>
            <p className="shellTitle">Secure access</p>
          </div>
        </div>

        <h1 className="title title--auth">Sign in with Supabase Auth.</h1>
        <p className="lede">
          Your budget data, Plaid connection, and transaction imports are scoped to
          the signed-in user.
        </p>

        <LoginForm nextPath={nextPath} errorMessage={errorMessage} />

        <div className="authFooter">
          <Link className="shellLink" href="/">
            Back to app
          </Link>
        </div>
      </section>
    </main>
  );
}
