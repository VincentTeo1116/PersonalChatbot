import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResearchForm from "../ResearchForm";
import { updateResearch, uploadResearchImage } from "../actions";

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
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-xl font-semibold text-foreground">Edit research paper</h1>
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
          submitLabel="Save changes"
        />
      </div>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Image</h2>
        <div className="relative h-32 w-52 overflow-hidden rounded-lg border border-border">
          <Image src={imageUrl} alt={research.title} fill className="object-cover" />
        </div>
        <form action={uploadResearchImage} className="flex items-end gap-2">
          <input type="hidden" name="id" value={id} />
          <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
            Upload
          </button>
        </form>
      </section>
    </div>
  );
}
