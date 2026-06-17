create table if not exists public.user_post_mentions (
  post_id uuid not null references public.user_posts(id) on delete cascade,
  user_id text not null,
  display_label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  constraint user_post_mentions_position_check check (position >= 0 and position < 10)
);

create index if not exists user_post_mentions_post_position_idx
  on public.user_post_mentions (post_id, position);

create index if not exists user_post_mentions_user_created_idx
  on public.user_post_mentions (user_id, created_at desc);

alter table public.user_post_mentions enable row level security;

drop policy if exists "Public can read post mentions" on public.user_post_mentions;
drop policy if exists "Post authors can manage mentions" on public.user_post_mentions;

create policy "Public can read post mentions"
  on public.user_post_mentions for select
  using (true);

create policy "Post authors can manage mentions"
  on public.user_post_mentions for all
  using (
    exists (
      select 1 from public.user_posts p
      where p.id = post_id and p.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1 from public.user_posts p
      where p.id = post_id and p.user_id = auth.uid()::text
    )
  );

insert into public.user_post_mentions (post_id, user_id, display_label, position)
select
  p.id,
  p.tagged_user_id,
  coalesce(p.tagged_person, '@' || up.username, up.display_name, 'Pessoa marcada'),
  0
from public.user_posts p
left join public.user_profiles up on up.user_id = p.tagged_user_id
where p.tagged_user_id is not null
on conflict (post_id, user_id) do nothing;
