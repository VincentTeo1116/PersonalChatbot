import { Suspense } from "react";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import TechMarquee from "@/components/TechMarquee";
import GithubStats from "@/components/GithubStats";
import GithubExhibitionSection from "@/components/GithubExhibitionSection";
import WorkExperience from "@/components/WorkExperience";
import MobileActionBar from "@/components/MobileActionBar";
import ModelDemo from "@/components/ModelDemo";
import Projects from "@/components/Projects";
import Research from "@/components/Research";
import FYP from "@/components/FYP";
import HackathonGallery from "@/components/HackathonGallery";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import SectionHeading from "@/components/SectionHeading";
import LatestWriting from "@/components/LatestWriting";
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
        <About profile={profile} research={research} />
        <TechMarquee items={profile.skills.flatMap((s) => s.items.map((i) => i.name))} />
        <Projects projects={projects} />
        {/* Proof first: something a visitor can use, then the story behind it, then who has worked with me. */}
        <ModelDemo caseStudies={projects.map((p) => p.slug)} />
        <LatestWriting />
        <WorkExperience experience={workExperience} />
        <Testimonials testimonials={testimonials} />
        <Research research={research}>
          <FYP fyp={fyp} />
        </Research>
        {profile.contact.github && (
          <section id="github" className="relative isolate overflow-hidden py-24 sm:py-32">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeading eyebrow="GitHub" title="Open-source work" />
            </div>
            <Suspense fallback={<div aria-hidden className="min-h-80" />}>
              <GithubStats githubUrl={profile.contact.github} />
            </Suspense>
            <Suspense fallback={<div aria-label="GitHub gallery loading" className="min-h-[40rem]"><p className="mx-auto mt-16 max-w-6xl px-6 text-text-secondary">Loading public repositories…</p></div>}>
              <GithubExhibitionSection githubUrl={profile.contact.github} />
            </Suspense>
          </section>
        )}
        <HackathonGallery hackathonPhotos={hackathonPhotos} />
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
