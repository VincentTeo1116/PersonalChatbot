import PageHeader from "@/components/admin/PageHeader";
import ResearchForm from "../ResearchForm";
import { createResearch } from "../actions";

export default function NewResearchPage() {
  return (
    <div>
      <PageHeader eyebrow="Content" title="New research paper" />
      <ResearchForm action={createResearch} submitLabel="Create" />
    </div>
  );
}
