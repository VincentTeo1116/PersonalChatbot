import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdmin } from "@/lib/admin-access";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, user: sessionUser } = await updateSession(request);
  // Having an account is not enough: only an allow-listed admin counts as signed in here.
  const user = isAllowedAdmin(sessionUser) ? sessionUser : null;

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
