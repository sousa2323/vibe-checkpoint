alter table public.venue_claim_requests
  add column if not exists cnpj text;

alter table public.venues
  add column if not exists cnpj text;

create index if not exists venue_claim_requests_cnpj_idx
  on public.venue_claim_requests (cnpj)
  where cnpj is not null;

create unique index if not exists venues_cnpj_unique_idx
  on public.venues (cnpj)
  where cnpj is not null;
