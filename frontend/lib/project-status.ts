/** Whether a project is shown on the public site. A hidden project keeps its sort_order, so publishing it again needs no re-sorting. */
export const PROJECT_STATUSES = ["published", "hidden"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Anything that is not exactly "hidden" counts as published, including rows from before the status column existed. */
export function normalizeProjectStatus(value: unknown): ProjectStatus {
  return value === "hidden" ? "hidden" : "published";
}

/** The status in a submitted form, or undefined when the form has none (the column is not there yet) or the value is not one we know. */
export function statusFromForm(value: FormDataEntryValue | null): ProjectStatus | undefined {
  return typeof value === "string" && (PROJECT_STATUSES as readonly string[]).includes(value) ? (value as ProjectStatus) : undefined;
}

/** The rows the public site may show, in the order they came in (already sorted by sort_order). Hidden rows are skipped, never renumbered. */
export function publishedOnly<T extends { status?: unknown }>(rows: T[]): T[] {
  return rows.filter((row) => normalizeProjectStatus(row.status) === "published");
}
