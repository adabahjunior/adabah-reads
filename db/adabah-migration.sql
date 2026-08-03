-- ============================================================================
-- ADABAH — PDF ➜ Audiobook chat app
-- Copy & paste this whole file into the SQL editor of your external Supabase
-- project (Dashboard ➜ SQL Editor ➜ New query ➜ Run).
-- Re-running is safe (IF NOT EXISTS / DROP POLICY IF EXISTS everywhere).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Threads (one row per conversation)
-- ---------------------------------------------------------------------------
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threads_user_updated_idx
  on public.threads (user_id, updated_at desc);

grant select, insert, update, delete on public.threads to authenticated;
grant all on public.threads to service_role;

alter table public.threads enable row level security;

drop policy if exists "threads owner select" on public.threads;
create policy "threads owner select" on public.threads
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "threads owner insert" on public.threads;
create policy "threads owner insert" on public.threads
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "threads owner update" on public.threads;
create policy "threads owner update" on public.threads
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "threads owner delete" on public.threads;
create policy "threads owner delete" on public.threads
  for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists threads_set_updated_at on public.threads;
create trigger threads_set_updated_at
  before update on public.threads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Messages (AI SDK UIMessage rows — parts kept as jsonb)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- AI SDK message id (e.g. "msg_abc"), text so it never clashes with uuid
  client_id text,
  role text not null check (role in ('user', 'assistant', 'system')),
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_created_idx
  on public.messages (thread_id, created_at asc);

create unique index if not exists messages_thread_client_id_key
  on public.messages (thread_id, client_id) where client_id is not null;

grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;

alter table public.messages enable row level security;

drop policy if exists "messages owner select" on public.messages;
create policy "messages owner select" on public.messages
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "messages owner insert" on public.messages;
create policy "messages owner insert" on public.messages
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "messages owner update" on public.messages;
create policy "messages owner update" on public.messages
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages owner delete" on public.messages;
create policy "messages owner delete" on public.messages
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Audiobooks (one row per generated MP3)
-- ---------------------------------------------------------------------------
create table if not exists public.audiobooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references public.threads(id) on delete set null,
  title text not null,
  source_filename text,
  voice text not null default 'alloy',
  page_count integer not null default 0,
  char_count integer not null default 0,
  chunk_count integer not null default 0,
  duration_seconds numeric,
  bytes bigint,
  -- path inside the "audiobooks" bucket: <user_id>/<audiobook_id>.mp3
  audio_path text,
  status text not null default 'ready' check (status in ('processing', 'ready', 'error')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audiobooks_user_created_idx
  on public.audiobooks (user_id, created_at desc);

grant select, insert, update, delete on public.audiobooks to authenticated;
grant all on public.audiobooks to service_role;

alter table public.audiobooks enable row level security;

drop policy if exists "audiobooks owner select" on public.audiobooks;
create policy "audiobooks owner select" on public.audiobooks
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "audiobooks owner insert" on public.audiobooks;
create policy "audiobooks owner insert" on public.audiobooks
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "audiobooks owner update" on public.audiobooks;
create policy "audiobooks owner update" on public.audiobooks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "audiobooks owner delete" on public.audiobooks;
create policy "audiobooks owner delete" on public.audiobooks
  for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists audiobooks_set_updated_at on public.audiobooks;
create trigger audiobooks_set_updated_at
  before update on public.audiobooks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Private storage bucket for the generated MP3 files
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audiobooks', 'audiobooks', false, 524288000, array['audio/mpeg', 'audio/mp3'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files live under <user_id>/... so ownership comes from the first folder.
drop policy if exists "audiobook files owner read" on storage.objects;
create policy "audiobook files owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'audiobooks' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audiobook files owner insert" on storage.objects;
create policy "audiobook files owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audiobooks' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audiobook files owner update" on storage.objects;
create policy "audiobook files owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'audiobooks' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audiobook files owner delete" on storage.objects;
create policy "audiobook files owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audiobooks' and (storage.foldername(name))[1] = auth.uid()::text);
