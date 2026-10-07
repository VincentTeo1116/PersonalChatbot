-- Run in the Supabase SQL Editor. Adds role/impact to projects and an availability line to profile, all optional and blank by default.
alter table public.projects add column if not exists role text;
alter table public.projects add column if not exists impact text;
alter table public.profile add column if not exists availability text;
