"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";

type Slide =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "video-file"; src: string }
  | { kind: "image"; src: string };

const AUTO_ADVANCE_MS = 3000;

// Pulls the video id out of any common YouTube URL shape; null means treat it as a direct video file instead.
function getYouTubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const match = u.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/);
      if (match) return match[1];
    }
  } catch {
    return null;
  }
  return null;
}

// Video-first auto-advancing carousel shared by ProjectModal and the case-study page. Owns its own slide state.
export default function ProjectMedia({
  title,
  image,
  screenshots,
  demoVideoUrl,
  aspectClassName = "aspect-[8/5] max-h-[45dvh]",
  children,
}: {
  title: string;
  image: string;
  screenshots?: string[];
  demoVideoUrl?: string;
  aspectClassName?: string;
  children?: ReactNode;
}) {
  const slides = useMemo<Slide[]>(() => {
    const images = screenshots?.length ? screenshots : [image];
    const imageSlides: Slide[] = images.map((src) => ({ kind: "image", src }));
    if (!demoVideoUrl) return imageSlides;

    const youtubeId = getYouTubeEmbedId(demoVideoUrl);
    const videoSlide: Slide = youtubeId
      ? { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&rel=0&modestbranding=1` }
      : { kind: "video-file", src: demoVideoUrl };
    return [videoSlide, ...imageSlides];
  }, [demoVideoUrl, screenshots, image]);

  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const goNext = () => setIndex((i) => (i + 1) % total);
  const goPrev = () => setIndex((i) => (i - 1 + total) % total);

  useEffect(() => {
    if (total <= 1) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % total);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + total) % total);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [total]);

  // Auto-advance every 3s, but pause on a video slide or while hovering.
  useEffect(() => {
    if (total <= 1 || isHovering || slides[index]?.kind !== "image") return;
    const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, isHovering, slides]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-black/40 ${aspectClassName}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {slides.map((slide, i) =>
        i !== index ? null : slide.kind === "youtube" ? (
          <iframe
            key={i}
            src={slide.embedUrl}
            title={`${title} demo video`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : slide.kind === "video-file" ? (
          <video key={i} src={slide.src} controls autoPlay muted className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <Image key={i} src={slide.src} alt={`${title} screenshot ${i + 1}`} fill className="object-cover" />
        )
      )}

      {total > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            &lsaquo;
          </button>
          <button
            onClick={goNext}
            aria-label="Next"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            &rsaquo;
          </button>
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"}`}
              />
            ))}
          </div>
        </>
      )}

      {children}
    </div>
  );
}
