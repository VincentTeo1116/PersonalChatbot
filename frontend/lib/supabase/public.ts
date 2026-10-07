import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Unlike lib/supabase/server.ts, this never touches cookies()/next/headers, so using it doesn't
// force the page into dynamic rendering. Anon key only -- fine for the public reads this is for,
// since every table it reads already allows public SELECT under RLS. Never use this for writes
// or anything that needs the logged-in admin's session.
export function createClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
