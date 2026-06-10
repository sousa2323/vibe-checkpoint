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
  pushed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('venue_update', 'event_reminder', 'post_comment', 'group_activity', 'reward')),
  constraint notifications_target_type_check check (target_type in ('venue', 'event', 'post', 'group', 'profile')),
  constraint notifications_user_unique_key_unique unique (user_id, unique_key)
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token text not null unique,
  platform text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_tokens_platform_check check (platform in ('ios', 'android', 'web'))
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists push_tokens_user_idx on public.push_tokens (user_id, last_seen_at desc);

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can manage own push tokens" on public.push_tokens;

create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid()::text);

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy "Users can manage own push tokens"
  on public.push_tokens for all
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
