import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import HackathonGallery from "@/components/HackathonGallery";
import Contact from "@/components/Contact";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import CommandPalette from "@/components/CommandPalette";
import TerminalEasterEgg from "@/components/TerminalEasterEgg";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <About />
        <Projects />
        <HackathonGallery />
        <Contact />
      </main>
      <ChatWidgetLoader />
      <CommandPalette />
      <TerminalEasterEgg />
    </>
  );
}
