import PageHeader from "@/components/admin/PageHeader";
import TestimonialForm from "../TestimonialForm";
import { createTestimonial } from "../actions";

export default function NewTestimonialPage() {
  return (
    <div>
      <PageHeader eyebrow="Content" title="New testimonial" />
      <TestimonialForm action={createTestimonial} submitLabel="Create" />
    </div>
  );
}
