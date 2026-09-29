-- Run this in the Supabase SQL Editor (after schema.sql has already been run once).
-- Adds testimonials/recommendations: a short quote + who said it, shown on the public
-- site as social proof. Optional small avatar photo per entry, same upload pattern as
-- the other single-image sections (research, work experience logo).

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text not null default '',
  quote text not null,
  avatar_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.testimonials (sort_order);

alter table public.testimonials enable row level security;

create policy "public read" on public.testimonials for select using (true);
create policy "admin write" on public.testimonials for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- No new Storage policies needed: the "portfolio-content" bucket's existing
-- public-read / authenticated-write policies from schema.sql already cover
-- any new folder path (e.g. testimonials/{id}/...).
