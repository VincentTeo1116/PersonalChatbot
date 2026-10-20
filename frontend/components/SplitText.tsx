import { Fragment, type CSSProperties } from "react";

/** Each word slides up out of an invisible mask, one after another (CSS-driven, so it runs before hydration). */
export default function SplitText({
  text,
  className = "",
  delay = 0,
  stagger = 0.07,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");

  return (
    <span className={className}>
      {/* aria-label isn't permitted on a bare span, so screen readers get the sentence as real text and the per-word animation spans are hidden from them. */}
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span aria-hidden className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
            <span
              className="enter-word inline-block"
              style={{ "--enter-delay": `${delay + i * stagger}s` } as CSSProperties}
            >
              {word}
            </span>
          </span>
          {/* The separator lives between the word blocks: a space inside an inline-block is collapsed away. */}
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}
