-- Move preferências privadas do explorador para tabela própria com RLS.
-- Mantém a coluna antiga em user_profiles apenas como compatibilidade/fallback.

create table if not exists public.explorer_preferences (
  user_id text primary key,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.explorer_preferences (user_id, preferences, created_at, updated_at)
select user_id, explorer_preferences, now(), now()
from public.user_profiles
where explorer_preferences is not null
  and explorer_preferences <> '{}'::jsonb
on conflict (user_id) do nothing;

update public.user_profiles
set explorer_preferences = '{}'::jsonb,
    updated_at = now()
where explorer_preferences is not null
  and explorer_preferences <> '{}'::jsonb;

alter table public.explorer_preferences enable row level security;

revoke all on public.explorer_preferences from anon;
grant select, insert, update, delete on public.explorer_preferences to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'explorer_preferences' and policyname = 'Users can read own explorer preferences'
  ) then
    create policy "Users can read own explorer preferences"
      on public.explorer_preferences for select
      to authenticated
      using (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'explorer_preferences' and policyname = 'Users can insert own explorer preferences'
  ) then
    create policy "Users can insert own explorer preferences"
      on public.explorer_preferences for insert
      to authenticated
      with check (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'explorer_preferences' and policyname = 'Users can update own explorer preferences'
  ) then
    create policy "Users can update own explorer preferences"
      on public.explorer_preferences for update
      to authenticated
      using (user_id = auth.uid()::text)
      with check (user_id = auth.uid()::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'explorer_preferences' and policyname = 'Users can delete own explorer preferences'
  ) then
    create policy "Users can delete own explorer preferences"
      on public.explorer_preferences for delete
      to authenticated
      using (user_id = auth.uid()::text);
  end if;
end $$;
