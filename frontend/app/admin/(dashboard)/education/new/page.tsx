import PageHeader from "@/components/admin/PageHeader";
import EducationForm from "../EducationForm";
import { createEducation } from "../actions";

export default function NewEducationPage() {
  return (
    <div>
      <PageHeader eyebrow="Content" title="New education entry" />
      <EducationForm action={createEducation} submitLabel="Create" />
    </div>
  );
}
