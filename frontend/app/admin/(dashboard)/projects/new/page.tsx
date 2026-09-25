import ProjectForm from "../ProjectForm";
import { createProject } from "../actions";

export default function NewProjectPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">New project</h1>
      <ProjectForm action={createProject} submitLabel="Create" />
    </div>
  );
}
