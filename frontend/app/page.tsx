import { Suspense } from "react";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import TechMarquee from "@/components/TechMarquee";
import GithubStats from "@/components/GithubStats";
import GithubExhibitionSection from "@/components/GithubExhibitionSection";
import ExploreMore from "@/components/ExploreMore";
import WorkExperience from "@/components/WorkExperience";
import MobileActionBar from "@/components/MobileActionBar";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import FYP from "@/components/FYP";
import HackathonGallery from "@/components/HackathonGallery";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import CommandPalette from "@/components/CommandPalette";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";
import MeetingRequestLauncher from "@/components/MeetingRequestLauncher";
import TestimonialLauncher from "@/components/TestimonialLauncher";
import ContactNudge from "@/components/ContactNudge";
import { getProfile, getProjects, getResearch, getFyp, getHackathonPhotos, getWorkExperience, getTestimonials } from "@/lib/data";

// Prerendered + cached; admin saves bust this instantly via revalidatePath("/"), this is just a safety-net refresh in case one of those is ever missed.
export const revalidate = 3600;

export default async function Home() {
  const profilePromise = getProfile();
  const [profile, projects, research, fyp, hackathonPhotos, workExperience, testimonials] = await Promise.all([
    profilePromise,
    getProjects(),
    getResearch(),
    getFyp(),
    getHackathonPhotos(),
    getWorkExperience(),
    getTestimonials(),
  ]);

  return (
    <>
      <Nav profile={profile} />
      <main className="flex-1 overflow-x-clip">
        <Hero profile={profile} />
        <Projects projects={projects} />
        <WorkExperience experience={workExperience} />
        <Research research={research} />
        <About profile={profile} research={research} />
        <TechMarquee items={profile.skills.flatMap((s) => s.items.map((i) => i.name))} />
        <FYP fyp={fyp} />
        <ExploreMore />
        <Suspense fallback={<div aria-hidden className="min-h-80" />}>
          <GithubStats githubUrl={profile.contact.github} />
        </Suspense>
        {profile.contact.github && (
          <Suspense fallback={<section aria-label="GitHub gallery loading" className="min-h-[44rem] py-24"><p className="mx-auto max-w-6xl px-6 text-text-secondary">Loading public repositories…</p></section>}>
            <GithubExhibitionSection githubUrl={profile.contact.github} />
          </Suspense>
        )}
        <HackathonGallery hackathonPhotos={hackathonPhotos} />
        <Testimonials testimonials={testimonials} />
        <Contact profile={profile} />
        <div aria-hidden className="h-16 sm:hidden" />
      </main>
      <MobileActionBar profile={profile} />
      <ChatWidgetLoader profile={profile} />
      <CommandPalette profile={profile} projects={projects} research={research} />
      <TerminalEasterEgg profile={profile} projects={projects} hackathonPhotos={hackathonPhotos} />
      <MeetingRequestLauncher />
      <TestimonialLauncher />
      <ContactNudge profile={profile} />
    </>
  );
}
