import PageHeader from "@/components/admin/PageHeader";
import ProjectForm from "../ProjectForm";
import { createProject } from "../actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").select("case_study").limit(0);
  const { error: seoError } = await supabase.from("projects").select("seo_title").limit(0);
  return (
    <div>
      <PageHeader eyebrow="Content" title="New project" />
      <ProjectForm action={createProject} submitLabel="Create" caseStudyEnabled={!error} seoEnabled={!seoError} />
    </div>
  );
}
