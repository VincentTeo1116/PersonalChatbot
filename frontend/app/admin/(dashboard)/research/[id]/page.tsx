import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ResearchForm from "../ResearchForm";
import { updateResearch, uploadResearchImage } from "../actions";
import { AdminForm } from "@/components/admin/AdminFeedback";

const BUCKET = "portfolio-content";

export default async function EditResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: research } = await supabase.from("research").select("*").eq("id", id).single();
  if (!research) notFound();

  const imageUrl = research.image_path
    ? supabase.storage.from(BUCKET).getPublicUrl(research.image_path).data.publicUrl
    : "/projects/placeholder.svg";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Edit research paper" />

      <ResearchForm
        research={{
          id: research.id,
          slug: research.slug,
          title: research.title,
          venue: research.venue,
          authors: research.authors ?? [],
          supervisor: research.supervisor,
          doi: research.doi,
          doiUrl: research.doi_url,
          description: research.description,
          image: imageUrl,
        }}
        action={updateResearch}
        redirectTo="/admin/research"
        submitLabel="Save changes"
      />

      <section className="admin-card max-w-2xl space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Image</h2>
        <div className="relative h-32 w-52 overflow-hidden rounded-xl border border-border">
          <Image src={imageUrl} alt={research.title} fill className="object-cover" />
        </div>
        <AdminForm action={uploadResearchImage} message="Image uploaded" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
        </AdminForm>
      </section>
    </div>
  );
}
