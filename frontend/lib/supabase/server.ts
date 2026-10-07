import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Cookie-authenticated Supabase client for Server Components/Actions/Route Handlers. Anon key only, RLS does the rest.
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
            // Safe to ignore here -- the proxy already refreshes the session cookie.
          }
        },
      },
    }
  );
}
