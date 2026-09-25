-- Run this in the Supabase SQL Editor (after schema.sql has already been run once).
-- Adds the Working Experience section: a timeline entry per job, with one small
-- company logo and up to 2 workplace photos each.

create table public.work_experience (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  company text not null,
  period text not null,
  detail text not null,
  logo_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_experience_images (
  id uuid primary key default gen_random_uuid(),
  work_experience_id uuid not null references public.work_experience(id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.work_experience_images (work_experience_id);

alter table public.work_experience enable row level security;
alter table public.work_experience_images enable row level security;

create policy "public read" on public.work_experience for select using (true);
create policy "public read" on public.work_experience_images for select using (true);

create policy "admin write" on public.work_experience for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.work_experience_images for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- No new Storage policies needed: the "portfolio-content" bucket's existing
-- public-read / authenticated-write policies from schema.sql already cover
-- any new folder path (e.g. work-experience/{id}/...).
