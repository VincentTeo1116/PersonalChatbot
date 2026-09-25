import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import HackathonGallery from "@/components/HackathonGallery";
import Contact from "@/components/Contact";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import CommandPalette from "@/components/CommandPalette";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";
import { getProfile, getProjects, getResearch, getHackathonPhotos } from "@/lib/data";

export default async function Home() {
  const [profile, projects, research, hackathonPhotos] = await Promise.all([
    getProfile(),
    getProjects(),
    getResearch(),
    getHackathonPhotos(),
  ]);

  return (
    <>
      <Nav profile={profile} />
      <main className="flex-1">
        <Hero profile={profile} />
        <About profile={profile} research={research} />
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
