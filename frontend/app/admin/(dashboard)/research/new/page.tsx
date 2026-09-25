import ResearchForm from "../ResearchForm";
import { createResearch } from "../actions";

export default function NewResearchPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">New research paper</h1>
      <ResearchForm action={createResearch} submitLabel="Create" />
    </div>
  );
}
