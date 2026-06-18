create extension if not exists pgcrypto;

alter table public.venue_claim_requests
  add column if not exists category text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists instagram text,
  add column if not exists whatsapp text,
  add column if not exists capacity integer,
  add column if not exists description text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists cover_image_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists review_note text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_venue_id uuid references public.venues(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'venue_claim_requests_status_check'
      and conrelid = 'public.venue_claim_requests'::regclass
  ) then
    alter table public.venue_claim_requests
      add constraint venue_claim_requests_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists venue_claim_requests_status_created_idx
  on public.venue_claim_requests (status, created_at desc);

create index if not exists venue_claim_requests_user_updated_idx
  on public.venue_claim_requests (user_id, updated_at desc);

alter table public.venue_claim_requests enable row level security;

drop policy if exists "Users can manage own venue claims" on public.venue_claim_requests;
drop policy if exists "Users can read own venue claims" on public.venue_claim_requests;
drop policy if exists "Users can insert own venue claims" on public.venue_claim_requests;
drop policy if exists "Users can update own pending venue claims" on public.venue_claim_requests;

create policy "Users can read own venue claims"
  on public.venue_claim_requests for select
  to authenticated
  using (user_id = auth.uid()::text);

create policy "Users can insert own venue claims"
  on public.venue_claim_requests for insert
  to authenticated
  with check (user_id = auth.uid()::text and status = 'pending');

create policy "Users can update own pending venue claims"
  on public.venue_claim_requests for update
  to authenticated
  using (user_id = auth.uid()::text and status in ('pending', 'rejected'))
  with check (user_id = auth.uid()::text and status = 'pending');
