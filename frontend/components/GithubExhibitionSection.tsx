import GithubExhibition from "@/components/GithubExhibition";
import { getGithubRepositories } from "@/lib/github";

export default async function GithubExhibitionSection({ githubUrl }: { githubUrl: string }) {
  const data = await getGithubRepositories(githubUrl);
  return data ? <GithubExhibition username={data.username} repositories={data.repositories} /> : null;
}
