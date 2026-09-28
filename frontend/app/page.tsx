import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import TechMarquee from "@/components/TechMarquee";
import WorkExperience from "@/components/WorkExperience";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import HackathonGallery from "@/components/HackathonGallery";
import Contact from "@/components/Contact";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import CommandPalette from "@/components/CommandPalette";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";
import { getProfile, getProjects, getResearch, getHackathonPhotos, getWorkExperience } from "@/lib/data";

export default async function Home() {
  const [profile, projects, research, hackathonPhotos, workExperience] = await Promise.all([
    getProfile(),
    getProjects(),
    getResearch(),
    getHackathonPhotos(),
    getWorkExperience(),
  ]);

  return (
    <>
      <Nav profile={profile} />
      <main className="flex-1">
        <Hero profile={profile} />
        <TechMarquee items={profile.skills.flatMap((s) => s.items)} />
        <About profile={profile} research={research} />
        <WorkExperience experience={workExperience} />
        <Projects projects={projects} />
        <Research research={research} />
        <HackathonGallery hackathonPhotos={hackathonPhotos} />
        <Contact profile={profile} />
      </main>
      <ChatWidgetLoader profile={profile} />
      <CommandPalette profile={profile} projects={projects} research={research} />
      <TerminalEasterEgg profile={profile} projects={projects} hackathonPhotos={hackathonPhotos} />
    </>
  );
}
