export function LoginForm(props: { nextPath: string; errorMessage?: string | null }) {
  return (
    <form className="authForm" action="/api/auth/login" method="post">
      <input type="hidden" name="next" value={props.nextPath} />
      <label className="authField">
        <span className="authLabel">Email</span>
        <input
          className="authInput"
          name="email"
          type="email"
          autoComplete="email"
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
          required
        />
      </label>
      <div className="authActionGrid">
        <button className="authButton" type="submit" name="mode" value="sign_in">
          Sign in
        </button>
        <button
          className="authButton authButton--secondary"
          type="submit"
          name="mode"
          value="sign_up"
        >
          Create account
        </button>
      </div>
      {props.errorMessage ? <p className="authError">{props.errorMessage}</p> : null}
    </form>
  );
}
