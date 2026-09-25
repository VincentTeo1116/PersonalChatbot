import ExperienceForm from "../ExperienceForm";
import { createExperience } from "../actions";

export default function NewExperiencePage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">New work experience entry</h1>
      <ExperienceForm action={createExperience} submitLabel="Create" />
    </div>
  );
}
