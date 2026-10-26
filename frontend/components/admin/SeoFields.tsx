export default function SeoFields({ title, description }: { title?: string; description?: string }) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-5">
      <legend className="px-1 text-base font-semibold text-foreground">Search appearance</legend>
      <input type="hidden" name="seoEnabled" value="true" />
      <p className="text-sm text-text-secondary">Describe the specific project or paper. Blank fields use its existing title and description. Google may choose different wording in search results.</p>
      <div>
        <label className="admin-label" htmlFor="seoTitle">Search and page headline</label>
        <input id="seoTitle" name="seoTitle" defaultValue={title} maxLength={160} className="admin-input" />
      </div>
      <div>
        <label className="admin-label" htmlFor="seoDescription">Search summary</label>
        <textarea id="seoDescription" name="seoDescription" defaultValue={description} maxLength={320} rows={3} className="admin-input" />
      </div>
    </fieldset>
  );
}
