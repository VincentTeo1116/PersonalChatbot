-- Run this in the Supabase SQL Editor (after schema.sql has already been run once).
-- Adds the Final Year Project section. Singleton row (like `profile`) since there's
-- only ever one FYP -- left entirely empty is fine, the public site shows a "Coming
-- Soon" card until `title` is filled in via /admin/fyp.

create table public.fyp (
  id smallint primary key default 1,
  title text,
  description text,
  github_url text,
  dataset_description text,
  video_url text,
  supervisor text,
  lecturer_feedback text,
  updated_at timestamptz not null default now(),
  constraint fyp_singleton check (id = 1)
);
insert into public.fyp (id) values (1) on conflict (id) do nothing;

create table public.fyp_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  is_cover boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index fyp_images_one_cover_idx on public.fyp_images (is_cover) where is_cover;

alter table public.fyp enable row level security;
alter table public.fyp_images enable row level security;

create policy "public read" on public.fyp for select using (true);
create policy "public read" on public.fyp_images for select using (true);

create policy "admin write" on public.fyp for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.fyp_images for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- No new Storage policies needed: the "portfolio-content" bucket's existing
-- public-read / authenticated-write policies from schema.sql already cover
-- any new folder path (e.g. fyp/...).
