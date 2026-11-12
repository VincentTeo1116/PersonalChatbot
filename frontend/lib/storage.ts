import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "portfolio-content";

// Only these kinds of file may be uploaded. The extension is chosen here from the detected type, never taken from the uploaded filename, and the file's own first bytes are checked, so a renamed script or HTML page can't be stored in the public bucket.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((b, i) => bytes[offset + i] === b);
}

function detectType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 4)) return "image/avif";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

// Returns the extension to store the file under, or throws a message safe to show the admin.
export async function checkUpload(file: File, allow: "image" | "pdf"): Promise<string> {
  if (file.size === 0) throw new Error("No file provided.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That file is too large (10 MB maximum).");
  const type = detectType(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const ok = allow === "pdf" ? type === "application/pdf" : !!type && type.startsWith("image/");
  if (!type || !ok) throw new Error(allow === "pdf" ? "Please upload a PDF file." : "Please upload a JPEG, PNG, WebP, GIF or AVIF image.");
  return EXTENSIONS[type];
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

  const ext = await checkUpload(file, "image");
  const path = `${folder}/image-${nextIndex}${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;

  return { path, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

// Uploads a PDF to {folder}/{name}.pdf, overwriting what's there -- for single-file cases like a resume, not a gallery.
export async function uploadFixedPdf(
  supabase: SupabaseClient,
  folder: string,
  name: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const ext = await checkUpload(file, "pdf");
  const path = `${folder}/${name}${ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (uploadError) throw uploadError;
  return { path, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function deleteImage(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
