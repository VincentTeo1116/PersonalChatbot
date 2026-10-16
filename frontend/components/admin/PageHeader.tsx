import type { ReactNode } from "react";

// Consistent eyebrow/title/description header for every admin page, with an optional action slot on the right (e.g. "+ Add new").
export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-300">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
