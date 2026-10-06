import "server-only";

export type ContributionDay = { date: string; count: number };
export type ContributionCalendar = {
  totalContributions: number;
  weeks: ContributionDay[][];
};

export type GithubStats = {
  username: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  topLanguages: string[];
  /** null if GITHUB_TOKEN isn't set or the GraphQL call fails -- the rest of the stats
   * above come from the unauthenticated REST API and work independently of this. */
  contributions: ContributionCalendar | null;
};

export type GithubRepository = {
  id: number;
  name: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  updatedAt: string;
  archived: boolean;
};

type GithubRepo = { stargazers_count?: number; language?: string | null; fork?: boolean };
type GithubUser = { public_repos?: number; followers?: number };

/** Fetches the owner's public repositories for the interactive exhibition.
 * Forks and the portfolio's own repo are omitted; GitHub's anonymous API is cached
 * for six hours and failures leave the rest of the homepage unaffected. */
export async function getGithubRepositories(
  githubUrl: string | undefined | null,
): Promise<{ username: string; repositories: GithubRepository[] } | null> {
  if (!githubUrl) return null;
  const username = extractUsername(githubUrl);
  if (!username) return null;

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`,
      { headers: { Accept: "application/vnd.github+json" }, next: { revalidate: 21600 } },
    );
    if (!response.ok) return null;
    const repos = (await response.json()) as Array<{
      id: number;
      name: string;
      description: string | null;
      html_url: string;
      homepage: string | null;
      language: string | null;
      topics?: string[];
      stargazers_count: number;
      forks_count: number;
      updated_at: string;
      fork: boolean;
      archived: boolean;
    }>;
    if (!Array.isArray(repos)) return null;

    return {
      username,
      repositories: repos
        .filter((repo) => !repo.fork && repo.name.toLowerCase() !== username.toLowerCase())
        .map((repo) => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          htmlUrl: repo.html_url,
          homepage: repo.homepage || null,
          language: repo.language,
          topics: repo.topics ?? [],
          stars: repo.stargazers_count ?? 0,
          forks: repo.forks_count ?? 0,
          updatedAt: repo.updated_at,
          archived: repo.archived,
        })),
    };
  } catch {
    return null;
  }
}

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
 * The green-square contribution calendar isn't available through GitHub's REST API at
 * all -- only the GraphQL API exposes it, which requires an authenticated token (no
 * special scopes needed, it's still just public data). Returns null if GITHUB_TOKEN
 * isn't configured or the request fails for any reason, same fail-open philosophy as
 * the rest of this module -- callers get the numeric stats regardless.
 */
async function getGithubContributions(username: string): Promise<ContributionCalendar | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }`,
        variables: { login: username },
      }),
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar?.weeks) return null;

    return {
      totalContributions: calendar.totalContributions ?? 0,
      weeks: calendar.weeks.map(
        (w: { contributionDays: { date: string; contributionCount: number }[] }) =>
          w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))
      ),
    };
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
    const [userRes, reposRes, contributions] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers, next: { revalidate: 21600 } }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
        headers,
        next: { revalidate: 21600 },
      }),
      getGithubContributions(username),
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
      contributions,
    };
  } catch {
    return null;
  }
}
