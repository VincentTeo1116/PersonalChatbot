import "server-only";

export type GithubStats = {
  username: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  topLanguages: string[];
};

type GithubRepo = { stargazers_count?: number; language?: string | null; fork?: boolean };
type GithubUser = { public_repos?: number; followers?: number };

/** Pulls the GitHub username out of a profile URL like "https://github.com/username".
 * Returns null for anything that isn't actually a github.com profile link. */
function extractUsername(githubUrl: string): string | null {
  try {
    const u = new URL(githubUrl);
    if (u.hostname.replace(/^www\./, "").toLowerCase() !== "github.com") return null;
    const segment = u.pathname.split("/").filter(Boolean)[0];
    return segment || null;
  } catch {
    return null;
  }
}

/**
 * Fetches public GitHub stats via the unauthenticated REST API (no token needed) and
 * builds our own numbers, rather than embedding a third-party stats image, so the
 * result matches the site's own design/theme exactly.
 *
 * Cached for 6 hours (Next's fetch cache) -- comfortably inside GitHub's unauthenticated
 * rate limit (60 requests/hour per IP) even though every page load would otherwise
 * trigger two API calls.
 *
 * Returns null on ANY failure (bad/missing URL, rate limited, network error, private or
 * nonexistent account) so a GitHub hiccup can never break the homepage -- the section
 * just doesn't render that day.
 */
export async function getGithubStats(githubUrl: string | undefined | null): Promise<GithubStats | null> {
  if (!githubUrl) return null;
  const username = extractUsername(githubUrl);
  if (!username) return null;

  try {
    const headers = { Accept: "application/vnd.github+json" };
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers, next: { revalidate: 21600 } }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
        headers,
        next: { revalidate: 21600 },
      }),
    ]);
    if (!userRes.ok || !reposRes.ok) return null;

    const user = (await userRes.json()) as GithubUser;
    const repos = (await reposRes.json()) as GithubRepo[];
    if (!Array.isArray(repos)) return null;

    const ownRepos = repos.filter((r) => !r.fork);
    const totalStars = ownRepos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);

    const languageCounts = new Map<string, number>();
    for (const r of ownRepos) {
      if (r.language) languageCounts.set(r.language, (languageCounts.get(r.language) ?? 0) + 1);
    }
    const topLanguages = [...languageCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([lang]) => lang);

    return {
      username,
      publicRepos: user.public_repos ?? ownRepos.length,
      followers: user.followers ?? 0,
      totalStars,
      topLanguages,
    };
  } catch {
    return null;
  }
}
