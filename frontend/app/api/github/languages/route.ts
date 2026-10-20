import { NextResponse, type NextRequest } from "next/server";
import { getRepoLanguages } from "@/lib/github";

// Proxies the GitHub Exhibition's per-repo language lookup through our own cached, optionally-authenticated server call instead of an unauthenticated client-side fetch -- see lib/github.ts:getRepoLanguages for the 6h cache that makes this shared across visitors.
export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get("owner");
  const repo = request.nextUrl.searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo query params are required" }, { status: 400 });
  }

  const languages = await getRepoLanguages(owner, repo);
  return NextResponse.json(languages);
}
