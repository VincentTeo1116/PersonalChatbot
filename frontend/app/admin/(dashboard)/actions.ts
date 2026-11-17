"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/** Rebuilds every public page from the database on its next visit. Saving in /admin already does this for the page it changes; this is for edits made outside it, such as a SQL migration, which would otherwise show up to an hour late. */
export async function refreshSite() {
  try {
    await requireAdmin();
  } catch {
    return { error: "You are signed out. Please sign in again." };
  }
  try {
    revalidatePath("/", "layout");
  } catch {
    return { error: "The site could not be refreshed. Please try again." };
  }
  return { ok: true as const };
}
