type Direction = "right" | "left" | "up-right" | "down";

export default function AnimatedArrow({ direction = "right" }: { direction?: Direction }) {
  return (
    <span className={`animated-arrow animated-arrow--${direction}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 12h16m-6-6 6 6-6 6" />
      </svg>
    </span>
  );
}

export function FlowArrow() {
  return <span className="flow-arrow" aria-hidden="true"><span className="flow-arrow__signal" /></span>;
}
