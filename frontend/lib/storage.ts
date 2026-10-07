import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "portfolio-content";

export function extOf(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot); // includes the leading "."
}

// Uploads to {folder}/image-{n}.{ext}, n = highest existing + 1. Doesn't fill gaps from deleted images.
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

// Uploads to a fixed path, overwriting what's there -- for single-file cases like a resume, not a gallery.
export async function uploadFixedFile(
  supabase: SupabaseClient,
  folder: string,
  filename: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const path = `${folder}/${filename}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  return { path, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function deleteImage(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
