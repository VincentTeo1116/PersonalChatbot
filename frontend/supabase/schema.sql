-- Run this entire file once in the Supabase SQL Editor (Project -> SQL Editor -> New query)
-- after creating the "portfolio-content" storage bucket (Storage -> New bucket -> Public on).

create table public.profile (
  id smallint primary key default 1,
  name text not null,
  tagline text not null,
  location text not null,
  hero_summary text not null,
  about text not null,
  avatar_path text,
  skills jsonb not null default '[]'::jsonb,
  stat_cgpa numeric,
  stat_hackathons int,
  contact_email text not null,
  contact_github text not null default '',
  contact_linkedin text not null default '',
  contact_resume_url text not null default '',
  updated_at timestamptz not null default now(),
  constraint profile_singleton check (id = 1)
);

create table public.education (
  id uuid primary key default gen_random_uuid(),
  degree text not null,
  institution text not null,
  period text not null,
  detail text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.education_images (
  id uuid primary key default gen_random_uuid(),
  education_id uuid not null references public.education(id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.education_images (education_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  tags text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  demo_video_url text,
  featured boolean not null default false,
  award text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  is_cover boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.project_images (project_id);
create unique index project_images_one_cover_idx on public.project_images (project_id) where is_cover;

create table public.research (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  venue text not null,
  authors text[] not null default '{}',
  supervisor text not null default '',
  doi text not null default '',
  doi_url text not null default '',
  description text not null,
  image_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hackathon_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Row Level Security: public read, admin-only (authenticated) write
alter table public.profile enable row level security;
alter table public.education enable row level security;
alter table public.education_images enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.research enable row level security;
alter table public.hackathon_photos enable row level security;

create policy "public read" on public.profile for select using (true);
create policy "public read" on public.education for select using (true);
create policy "public read" on public.education_images for select using (true);
create policy "public read" on public.projects for select using (true);
create policy "public read" on public.project_images for select using (true);
create policy "public read" on public.research for select using (true);
create policy "public read" on public.hackathon_photos for select using (true);

create policy "admin write" on public.profile for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.education for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.education_images for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.projects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.project_images for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.research for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write" on public.hackathon_photos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Storage: public read, authenticated (admin) write on the portfolio-content bucket
create policy "public read portfolio-content" on storage.objects for select
  using (bucket_id = 'portfolio-content');
create policy "authenticated insert portfolio-content" on storage.objects for insert
  with check (bucket_id = 'portfolio-content' and auth.role() = 'authenticated');
create policy "authenticated update portfolio-content" on storage.objects for update
  using (bucket_id = 'portfolio-content' and auth.role() = 'authenticated');
create policy "authenticated delete portfolio-content" on storage.objects for delete
  using (bucket_id = 'portfolio-content' and auth.role() = 'authenticated');
