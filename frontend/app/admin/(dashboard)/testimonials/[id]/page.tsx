import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import TestimonialForm from "../TestimonialForm";
import { updateTestimonial, uploadTestimonialAvatar } from "../actions";

const BUCKET = "portfolio-content";

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: testimonial } = await supabase.from("testimonials").select("*").eq("id", id).single();
  if (!testimonial) notFound();

  const avatarUrl = testimonial.avatar_path
    ? supabase.storage.from(BUCKET).getPublicUrl(testimonial.avatar_path).data.publicUrl
    : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Edit testimonial" />

      <TestimonialForm
        testimonial={{
          id: testimonial.id,
          authorName: testimonial.author_name,
          authorRole: testimonial.author_role,
          quote: testimonial.quote,
          avatarUrl,
          status: testimonial.status ?? "approved",
        }}
        action={updateTestimonial}
        submitLabel="Save changes"
      />

      <section className="admin-card max-w-2xl space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Photo (optional)</h2>
        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-background">
          {avatarUrl && <Image src={avatarUrl} alt={testimonial.author_name} fill className="object-cover" />}
        </div>
        <form action={uploadTestimonialAvatar} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
        </form>
      </section>
    </div>
  );
}
