alter table public.group_plan_votes enable row level security;

drop policy if exists "Public can read group plan votes" on public.group_plan_votes;
drop policy if exists "Public can insert group plan votes" on public.group_plan_votes;
drop policy if exists "Group creators can read votes" on public.group_plan_votes;

create policy "Group creators can read votes"
  on public.group_plan_votes for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_plans gp
      where gp.id = group_id
        and gp.creator_user_id = auth.uid()::text
    )
  );

-- The public share link still votes through the server function. Direct API inserts stay closed.
