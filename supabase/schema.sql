-- Run this in the Supabase SQL editor (Project > SQL Editor).
create table if not exists public.notes (
  id bigint generated always as identity primary key,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Demo policies: anyone with the anon key can read and insert.
-- Tighten these before using real user data.
create policy "public read notes" on public.notes
  for select using (true);

create policy "public insert notes" on public.notes
  for insert with check (true);
