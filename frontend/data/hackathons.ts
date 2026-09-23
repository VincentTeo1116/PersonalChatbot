export type HackathonPhoto = {
  src: string;
  caption: string;
};

// Replace the placeholder images in public/hackathons/ with your real photos
// (same filenames, or update src below), and edit the captions.
export const hackathonPhotos: HackathonPhoto[] = [
  { src: "/hackathons/placeholder-1.svg", caption: "[Hackathon name] — [Year], [what you built / result]" },
  { src: "/hackathons/placeholder-2.svg", caption: "[Hackathon name] — [Year], [team photo / on-site moment]" },
  { src: "/hackathons/placeholder-3.svg", caption: "[Hackathon name] — [Year], [presenting / demoing]" },
  { src: "/hackathons/placeholder-4.svg", caption: "[Hackathon name] — [Year], [award / certificate]" },
];
