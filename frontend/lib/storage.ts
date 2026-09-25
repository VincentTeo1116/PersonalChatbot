import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "portfolio-content";

function extOf(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot); // includes the leading "."
}

/**
 * Uploads a file into `{folder}/image-{n}.{ext}`, where n is one more than
 * the highest existing `image-N` in that folder. Not gap-filling: deleting
 * image-2 and uploading again produces image-4, not a reused image-2.
 * `upsert: false` so a same-name collision (a rare race) fails loudly.
 */
export async function uploadNextImage(
  supabase: SupabaseClient,
  folder: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const { data: existing, error: listError } = await supabase.storage.from(BUCKET).list(folder);
  if (listError) throw listError;

  const nextIndex =
    (existing ?? []).reduce((max, entry) => {
      const match = /^image-(\d+)\./.exec(entry.name);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  const path = `${folder}/image-${nextIndex}${extOf(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  return { path, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function deleteImage(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
