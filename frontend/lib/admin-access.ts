// Who may use /admin. Kept free of server-only imports so proxy.ts can share it with the server actions.

// ADMIN_EMAILS is a comma-separated allow-list (server-only env var). Supabase's "authenticated" role means "has an account", which is not the same as "is the owner", so the app checks the address as well.
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// While ADMIN_EMAILS is unset, any signed-in account is accepted so a fresh deploy doesn't lock the owner out; the admin dashboard shows a warning until it is set.
export function adminAllowListConfigured(): boolean {
  return adminEmails().length > 0;
}

export function isAllowedAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user) return false;
  const allowed = adminEmails();
  if (allowed.length === 0) return true;
  return !!user.email && allowed.includes(user.email.toLowerCase());
}
