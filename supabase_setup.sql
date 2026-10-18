-- Run this in Supabase Dashboard > SQL Editor.
-- Shared couple journal: authenticated users can read, add, edit and delete memories.
create extension if not exists pgcrypto;
create table if not exists public.memories (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 memory_date date,
 caption text default '',
 details text default '',
 image_path text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.memories enable row level security;
drop policy if exists "Couple can read memories" on public.memories;
drop policy if exists "Couple can add memories" on public.memories;
drop policy if exists "Couple can edit memories" on public.memories;
drop policy if exists "Couple can delete memories" on public.memories;
create policy "Couple can read memories" on public.memories for select to authenticated using (true);
create policy "Couple can add memories" on public.memories for insert to authenticated with check (auth.uid() = created_by);
create policy "Couple can edit memories" on public.memories for update to authenticated using (true) with check (true);
create policy "Couple can delete memories" on public.memories for delete to authenticated using (true);

-- Create a PUBLIC Storage bucket named couple-memories in Storage > New bucket.
-- Then run the following policies. Public bucket means anyone who obtains an image URL
-- can view that image; do not upload anything you want strictly private.
drop policy if exists "Authenticated couple uploads photos" on storage.objects;
drop policy if exists "Authenticated couple updates photos" on storage.objects;
drop policy if exists "Authenticated couple deletes photos" on storage.objects;
drop policy if exists "Authenticated couple reads photos" on storage.objects;
create policy "Authenticated couple uploads photos" on storage.objects for insert to authenticated
 with check (bucket_id = 'couple-memories');
create policy "Authenticated couple updates photos" on storage.objects for update to authenticated
 using (bucket_id = 'couple-memories') with check (bucket_id = 'couple-memories');
create policy "Authenticated couple deletes photos" on storage.objects for delete to authenticated
 using (bucket_id = 'couple-memories');
create policy "Authenticated couple reads photos" on storage.objects for select to authenticated
 using (bucket_id = 'couple-memories');


-- Shared feed/profile upgrade: run this migration in Supabase SQL Editor.
-- Existing memories remain in place; older posts are labelled as shared memories.
alter table public.memories add column if not exists author_name text;
update public.memories set author_name = 'Our memory' where author_name is null;
