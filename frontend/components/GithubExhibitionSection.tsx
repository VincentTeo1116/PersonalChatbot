import GithubExhibitionLazy from "@/components/GithubExhibitionLazy";
import { getGithubRepositories } from "@/lib/github";

export default async function GithubExhibitionSection({ githubUrl }: { githubUrl: string }) {
  const data = await getGithubRepositories(githubUrl);
  return data ? <GithubExhibitionLazy username={data.username} repositories={data.repositories} /> : null;
}
