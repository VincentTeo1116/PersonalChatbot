-- Lets the admin hide a project without deleting it or touching its position. Run once in the Supabase SQL editor.
--
-- status = 'published' : shown on the site, in the sitemap, and to the chatbot (the default, so every existing project stays live).
-- status = 'hidden'    : not shown anywhere public. sort_order is left alone, so the remaining projects simply close up in the same
--                        order, and publishing the project again puts it straight back where it was.
--
-- The public read policy is changed too, so a hidden project is not readable with the public database key either (not just left
-- out of the pages). The admin policy ("admin write", for all, authenticated) already lets the admin see and edit every row.
-- The website code works before and after this is run: until the column exists, every project is treated as published.

alter table public.projects
  add column if not exists status text not null default 'published' check (status in ('published', 'hidden'));

drop policy if exists "public read" on public.projects;
create policy "public read published" on public.projects for select using (status = 'published');

-- A hidden project's image list is private as well.
drop policy if exists "public read" on public.project_images;
create policy "public read published" on public.project_images for select using (
  exists (select 1 from public.projects p where p.id = project_id and p.status = 'published')
);
