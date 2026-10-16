import PageHeader from "@/components/admin/PageHeader";
import ExperienceForm from "../ExperienceForm";
import { createExperience } from "../actions";

export default function NewExperiencePage() {
  return (
    <div>
      <PageHeader eyebrow="Content" title="New work experience entry" />
      <ExperienceForm action={createExperience} submitLabel="Create" />
    </div>
  );
}
