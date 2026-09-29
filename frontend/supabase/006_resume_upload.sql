-- Run this in the Supabase SQL Editor (after schema.sql has already been run once).
-- Lets the admin upload a resume PDF directly (like the avatar) instead of only typing
-- an external URL. contact_resume_url is kept as a fallback/override for anyone who'd
-- rather link to an external resume (e.g. a Google Drive link) instead of uploading one.

alter table public.profile add column if not exists resume_path text;
