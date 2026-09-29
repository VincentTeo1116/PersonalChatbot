"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";

export type PreviewItem = {
  title: string;
  description: string;
  tags?: string[];
  image: string;
  screenshots?: string[];
  demoVideoUrl?: string;
  links: { label: string; url: string }[];
};

type Slide =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "video-file"; src: string }
  | { kind: "image"; src: string };

const AUTO_ADVANCE_MS = 3000;

/** Extracts the video id from any common YouTube URL shape, or null if it isn't one
 * (in which case the url is treated as a direct video file, e.g. an mp4 link). */
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

export default function ProjectModal({
  project,
  onClose,
}: {
  project: PreviewItem;
  onClose: () => void;
}) {
  const slides = useMemo<Slide[]>(() => {
    const images = project.screenshots?.length ? project.screenshots : [project.image];
    const imageSlides: Slide[] = images.map((src) => ({ kind: "image", src }));
    if (!project.demoVideoUrl) return imageSlides;

    const youtubeId = getYouTubeEmbedId(project.demoVideoUrl);
    const videoSlide: Slide = youtubeId
      ? { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&rel=0&modestbranding=1` }
      : { kind: "video-file", src: project.demoVideoUrl };
    return [videoSlide, ...imageSlides];
  }, [project.demoVideoUrl, project.screenshots, project.image]);

  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const goNext = () => setIndex((i) => (i + 1) % total);
  const goPrev = () => setIndex((i) => (i - 1 + total) % total);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && total > 1) setIndex((i) => (i + 1) % total);
      if (e.key === "ArrowLeft" && total > 1) setIndex((i) => (i - 1 + total) % total);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, total]);

  // Auto-advance through images every 3s. Paused on a video slide (so it doesn't get
  // cut off mid-playback) and while the visitor is hovering the media area.
  useEffect(() => {
    if (total <= 1 || isHovering || slides[index]?.kind !== "image") return;
    const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, isHovering, slides]);

  const primaryLink = project.links[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative aspect-[8/5] max-h-[45dvh] shrink-0 overflow-hidden bg-black/40"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {slides.map((slide, i) =>
            i !== index ? null : slide.kind === "youtube" ? (
              <iframe
                key={i}
                src={slide.embedUrl}
                title={`${project.title} demo video`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : slide.kind === "video-file" ? (
              <video key={i} src={slide.src} controls autoPlay muted className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <Image key={i} src={slide.src} alt={`${project.title} screenshot ${i + 1}`} fill className="object-cover" />
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

          <button
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <h3 className="font-semibold text-foreground text-lg">{project.title}</h3>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">{project.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(project.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-hover border border-border px-2.5 py-1 text-xs text-text-secondary"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {primaryLink && (
              <a
                href={primaryLink.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400 hover:scale-105 active:scale-95"
              >
                {primaryLink.label} &rarr;
              </a>
            )}
            {project.links.slice(1).map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 hover:scale-105 active:scale-95"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
