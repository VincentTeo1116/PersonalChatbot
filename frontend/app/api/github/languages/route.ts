import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/data";
import { extractUsername, getRepoLanguages } from "@/lib/github";

// Proxies the GitHub Exhibition's per-repo language lookup through our own cached, optionally-authenticated server call instead of an unauthenticated client-side fetch -- see lib/github.ts:getRepoLanguages for the 6h cache that makes this shared across visitors.
export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get("owner");
  const repo = request.nextUrl.searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo query params are required" }, { status: 400 });
  }

  // Only this site's own GitHub account and plausible repo names: otherwise anyone could spend the server's GitHub rate limit on arbitrary repositories.
  const profile = await getProfile();
  const allowedOwner = extractUsername(profile.contact.github);
  if (!allowedOwner || owner.toLowerCase() !== allowedOwner.toLowerCase() || !/^[A-Za-z0-9._-]{1,100}$/.test(repo)) {
    return NextResponse.json({ error: "Unknown repository" }, { status: 404 });
  }

  const languages = await getRepoLanguages(owner, repo);
  return NextResponse.json(languages);
}
