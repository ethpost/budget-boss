export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="shellLink shellLinkButton" type="submit">
        Sign out
      </button>
    </form>
  );
}
