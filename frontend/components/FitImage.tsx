import Image from "next/image";

/**
 * Shows the whole uploaded image inside its frame, never cropped. Where the image's shape differs from the frame,
 * the leftover space is filled with a blurred, enlarged copy of the same image instead of empty bars.
 * An image that already matches the frame simply covers it, and the backdrop is never seen.
 * The parent must be `relative` with `overflow-hidden`.
 */
export default function FitImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  /** Extra classes for the sharp image, e.g. a hover zoom. */
  className?: string;
  priority?: boolean;
}) {
  return (
    <>
      {/* Backdrop: requested at thumbnail size (it is blurred anyway), so it adds almost nothing to the download. */}
      <Image src={src} alt="" aria-hidden fill sizes="96px" className="scale-125 object-cover blur-2xl brightness-90 saturate-125" />
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${className}`} />
    </>
  );
}
