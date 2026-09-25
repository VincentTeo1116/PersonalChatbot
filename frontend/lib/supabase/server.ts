import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cookie-authenticated Supabase client for Server Components, Server Actions,
 * and Route Handlers. Uses the anon key; RLS decides what the current session
 * (or lack of one) is allowed to read/write. Never use the service role key here.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component (not a Server Action/Route Handler) —
            // safe to ignore since the proxy already refreshes the session cookie.
          }
        },
      },
    }
  );
}
