-- Lets visitors submit their own testimonial, held as "pending" until an admin approves it; existing testimonials (and anything you add yourself in /admin) stay visible immediately.

-- Defaulting to 'approved' (not 'pending') is deliberate: ADD COLUMN ... DEFAULT backfills every *existing* row with that value too. Defaulting to 'pending' would instantly hide every testimonial you already have live. Only the new public submission path explicitly inserts 'pending'.
alter table public.testimonials
  add column if not exists status text not null default 'approved' check (status in ('pending', 'approved'));

-- Replace the old "always visible" public-read policy with one scoped to approved rows.
drop policy if exists "public read" on public.testimonials;
create policy "public read approved" on public.testimonials for select using (status = 'approved');

-- Visitors may insert a new testimonial, but only ever as "pending" -- never approved directly. The existing "admin write" policy (for all, authenticated) already lets the admin read/update/delete rows of any status, including approving a pending one.
create policy "anon insert pending" on public.testimonials for insert
  with check (status = 'pending');
