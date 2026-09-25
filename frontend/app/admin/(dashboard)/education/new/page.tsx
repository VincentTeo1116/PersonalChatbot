import EducationForm from "../EducationForm";
import { createEducation } from "../actions";

export default function NewEducationPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">New education entry</h1>
      <EducationForm action={createEducation} submitLabel="Create" />
    </div>
  );
}
