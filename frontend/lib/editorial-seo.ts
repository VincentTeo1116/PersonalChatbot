/** Shared by project/research editors and their server actions. */
export function editorialSeoFields(formData: FormData) {
  if (formData.get("seoEnabled") !== "true") return {};
  return {
    seo_title: String(formData.get("seoTitle") ?? "").trim().slice(0, 160) || null,
    seo_description: String(formData.get("seoDescription") ?? "").trim().slice(0, 320) || null,
  };
}
