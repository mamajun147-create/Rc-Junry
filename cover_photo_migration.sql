-- Our Little Universe: persistent shared cover photo
-- Run this file in Supabase Dashboard > SQL Editor > New query, then click Run.
-- This creates one shared setting for both logged-in accounts; it does not delete memories.
create table if not exists public.couple_settings (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.couple_settings enable row level security;
drop policy if exists "Authenticated users can read couple settings" on public.couple_settings;
drop policy if exists "Authenticated users can save couple settings" on public.couple_settings;
create policy "Authenticated users can read couple settings"
  on public.couple_settings for select to authenticated using (true);
create policy "Authenticated users can save couple settings"
  on public.couple_settings for all to authenticated using (true) with check (true);

-- Ensure the existing photo bucket exists and is public so existing publicImage() can display photos.
insert into storage.buckets (id, name, public)
values ('couple-memories', 'couple-memories', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload images to this bucket. Existing policies may already cover these.
drop policy if exists "Authenticated couple uploads photos" on storage.objects;
drop policy if exists "Authenticated couple reads photos" on storage.objects;
drop policy if exists "Authenticated couple updates photos" on storage.objects;
drop policy if exists "Authenticated couple deletes photos" on storage.objects;
create policy "Authenticated couple uploads photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'couple-memories');
create policy "Authenticated couple reads photos" on storage.objects for select to authenticated
  using (bucket_id = 'couple-memories');
create policy "Authenticated couple updates photos" on storage.objects for update to authenticated
  using (bucket_id = 'couple-memories') with check (bucket_id = 'couple-memories');
create policy "Authenticated couple deletes photos" on storage.objects for delete to authenticated
  using (bucket_id = 'couple-memories');
