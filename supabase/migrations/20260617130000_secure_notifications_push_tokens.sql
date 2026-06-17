-- Protege notificações internas e tokens push no acesso direto via Supabase API.
-- O backend continua usando a conexão server-side, sem FORCE RLS.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  unique_key text not null,
  type text not null,
  title text not null,
  body text not null default '',
  target_type text not null,
  target_id text not null,
  route text not null,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_user_unique_key_unique unique (user_id, unique_key)
);

alter table public.notifications add column if not exists archived_at timestamptz;
alter table public.notifications add column if not exists pushed_at timestamptz;
alter table public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token text not null unique,
  platform text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_active_created_idx
  on public.notifications (user_id, created_at desc)
  where archived_at is null;

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null and archived_at is null;

create index if not exists push_tokens_user_idx
  on public.push_tokens (user_id, last_seen_at desc);

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

revoke all on public.notifications from anon;
revoke all on public.push_tokens from anon;

grant select, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can read own notifications'
  ) then
    create policy "Users can read own notifications"
      on public.notifications for select
      to authenticated
      using (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can update own notifications'
  ) then
    create policy "Users can update own notifications"
      on public.notifications for update
      to authenticated
      using (user_id = auth.uid()::text)
      with check (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'Users can delete own notifications'
  ) then
    create policy "Users can delete own notifications"
      on public.notifications for delete
      to authenticated
      using (user_id = auth.uid()::text);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'Users can read own push tokens'
  ) then
    create policy "Users can read own push tokens"
      on public.push_tokens for select
      to authenticated
      using (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'Users can insert own push tokens'
  ) then
    create policy "Users can insert own push tokens"
      on public.push_tokens for insert
      to authenticated
      with check (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'Users can update own push tokens'
  ) then
    create policy "Users can update own push tokens"
      on public.push_tokens for update
      to authenticated
      using (user_id = auth.uid()::text)
      with check (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_tokens' and policyname = 'Users can delete own push tokens'
  ) then
    create policy "Users can delete own push tokens"
      on public.push_tokens for delete
      to authenticated
      using (user_id = auth.uid()::text);
  end if;
end $$;
