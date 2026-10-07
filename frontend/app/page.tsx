import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import TechMarquee from "@/components/TechMarquee";
import GithubStats from "@/components/GithubStats";
import GithubExhibition from "@/components/GithubExhibition";
import WorkExperience from "@/components/WorkExperience";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import FYP from "@/components/FYP";
import HackathonGallery from "@/components/HackathonGallery";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import CommandPalette from "@/components/CommandPalette";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";
import { getProfile, getProjects, getResearch, getFyp, getHackathonPhotos, getWorkExperience, getTestimonials } from "@/lib/data";
import { getGithubRepositories } from "@/lib/github";

// Prerendered + cached; admin saves bust this instantly via revalidatePath("/"), this is just
// a safety-net refresh in case one of those is ever missed.
export const revalidate = 3600;

export default async function Home() {
  const profilePromise = getProfile();
  const [profile, projects, research, fyp, hackathonPhotos, workExperience, testimonials, githubExhibition] = await Promise.all([
    profilePromise,
    getProjects(),
    getResearch(),
    getFyp(),
    getHackathonPhotos(),
    getWorkExperience(),
    getTestimonials(),
    profilePromise.then((value) => getGithubRepositories(value.contact.github)),
  ]);

  return (
    <>
      <Nav profile={profile} />
      <main className="flex-1">
        <Hero profile={profile} />
        <TechMarquee items={profile.skills.flatMap((s) => s.items.map((i) => i.name))} />
        <About profile={profile} research={research} />
        <GithubStats githubUrl={profile.contact.github} />
        <WorkExperience experience={workExperience} />
        <Projects projects={projects} />
        {githubExhibition && (
          <GithubExhibition
            username={githubExhibition.username}
            repositories={githubExhibition.repositories}
          />
        )}
        <Research research={research} />
        <FYP fyp={fyp} />
        <HackathonGallery hackathonPhotos={hackathonPhotos} />
        <Testimonials testimonials={testimonials} />
        <Contact profile={profile} />
      </main>
      <ChatWidgetLoader profile={profile} />
      <CommandPalette profile={profile} projects={projects} research={research} />
      <TerminalEasterEgg profile={profile} projects={projects} hackathonPhotos={hackathonPhotos} />
    </>
  );
}
