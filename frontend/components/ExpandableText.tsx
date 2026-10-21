"use client";

import { useState } from "react";

const CLAMP_FROM = 260;

/** Clamps long text to a few lines on small screens with a Read more toggle; always full from `lg` up. */
export default function ExpandableText({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const clampable = text.length > CLAMP_FROM;

  return (
    <>
      <p className={`${className} ${clampable && !open ? "line-clamp-4 lg:line-clamp-none" : ""}`}>{text}</p>
      {clampable && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-2 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300 lg:hidden"
        >
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </>
  );
}
