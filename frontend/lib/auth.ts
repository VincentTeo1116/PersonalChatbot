import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAllowedAdmin } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

// First line of every admin server action. The proxy already guards /admin pages, but a server action is an endpoint in its own right, so it must not depend on that alone.
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedAdmin(user)) throw new Error("Not authorised");
  return user;
}
