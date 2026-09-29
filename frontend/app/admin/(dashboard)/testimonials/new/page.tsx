import TestimonialForm from "../TestimonialForm";
import { createTestimonial } from "../actions";

export default function NewTestimonialPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">New testimonial</h1>
      <TestimonialForm action={createTestimonial} submitLabel="Create" />
    </div>
  );
}
