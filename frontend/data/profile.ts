export const profile = {
  name: "Vincent Teo",
  tagline: "Aspiring Software Engineer, specialising in AI/ML",
  location: "Kuala Lumpur, Malaysia",
  heroSummary:
    "I build full-stack products with a focus on practical AI — from a real-time LMS serving " +
    "APU students to hackathon platforms that turn CVE data, medical reports, and fake news " +
    "into plain-English insights using RAG and LLM integrations (Gemini, AWS PartyRock, Z.AI GLM).",
  about:
    "I'm a Computer Science (Artificial Intelligence) undergraduate at Asia Pacific University, " +
    "having moved from a Software Engineering diploma into a deeper focus on AI/ML — currently " +
    "holding a 4.00 CGPA. Outside class, I've trained people-counting models as a Software Intern " +
    "at FootfallCam, built APMoodle (a full-stack LMS with real-time chat and live progress " +
    "tracking) with a team of five, and shipped four hackathon projects in under a year — including " +
    "an AI CVE-summarising assistant that won 3rd place at the GTD x APU Hackathon. I also tutor " +
    "kids aged 8–17 in programming, which keeps me honest about explaining things simply.",

  // Replace the placeholder images in public/education/ with real photos
  // (same filenames, or update src below), and edit the captions.
  education: [
    {
      degree: "Bachelor's Degree, Computer Science (Artificial Intelligence)",
      institution: "Asia Pacific University of Technology & Innovation (APU)",
      period: "Nov 2025 – Present",
      detail: "CGPA: 4.00. Coursework: EduConnect Learning Centre (ReactJS, CSS).",
      images: [
        { src: "/education/placeholder-1.svg", caption: "APU logo" },
        { src: "/education/placeholder-2.svg", caption: "APU campus" },
      ],
    },
    {
      degree: "Diploma in Information & Communication Technology (Software Engineering)",
      institution: "Asia Pacific University of Technology & Innovation (APU)",
      period: "Jul 2023 – Jun 2025",
      detail: "CGPA: 3.74. Coursework: ResearchSnake (Python), CodeMaster (HTML, CSS).",
      images: [
        { src: "/education/placeholder-1.svg", caption: "APU logo" },
        { src: "/education/placeholder-2.svg", caption: "APU campus" },
      ],
    },
  ],

  skills: {
    Languages: ["Python", "Java", "TypeScript", "JavaScript", "C#", "PHP"],
    "AI / ML": [
      "PyTorch",
      "TensorFlow",
      "scikit-learn",
      "Hugging Face",
      "OpenCV",
      "YOLO",
      "RAG pipelines",
      "Random Forest",
      "XGBoost",
      "Gemini & OpenAI APIs",
    ],
    "Frameworks": ["React", "Next.js", "Node.js", "FastAPI", "ASP.NET"],
    "Tools & Infra": ["Docker", "Git", "Supabase (PostgreSQL)", "MongoDB", "SQL / MariaDB", "CI/CD"],
  },

  contact: {
    email: "tkqvincent2@gmail.com",
    github: "",
    linkedin: "https://linkedin.com/in/kai-qi-vincent-teo-1596ab286",
    resumeUrl: "/resume.pdf",
  },
};
