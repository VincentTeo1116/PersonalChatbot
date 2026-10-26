import PageHeader from "@/components/admin/PageHeader";
import ResearchForm from "../ResearchForm";
import { createResearch } from "../actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewResearchPage() {
  const supabase = await createClient();
  const { error } = await supabase.from("research").select("case_study,seo_title").limit(0);
  return (
    <div>
      <PageHeader eyebrow="Content" title="New research paper" />
      <ResearchForm action={createResearch} submitLabel="Create" editorialEnabled={!error} />
    </div>
  );
}
