import PageHeader from "@/components/admin/PageHeader";
import ProjectForm from "../ProjectForm";
import { createProject } from "../actions";

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader eyebrow="Content" title="New project" />
      <ProjectForm action={createProject} submitLabel="Create" />
    </div>
  );
}
