"use server";

import { redirect } from "next/navigation";
import { HUMAN_CHECK_MESSAGE, passesHumanCheck, RATE_LIMIT_MESSAGE, tooManyRequests } from "@/lib/request-guard";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // A few attempts per 10 minutes per address, on top of whatever Supabase enforces itself.
  if (await tooManyRequests("admin-login", 8, 10 * 60 * 1000)) return { error: RATE_LIMIT_MESSAGE };
  if (!(await passesHumanCheck(formData))) return { error: HUMAN_CHECK_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/admin");
}
