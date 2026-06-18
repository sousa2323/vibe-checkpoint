update public.user_profiles up
set account_type = 'owner',
    onboarding_completed = true,
    updated_at = now()
where exists (
  select 1
  from public.venues v
  where v.owner_user_id = up.user_id
)
and (up.account_type <> 'owner' or up.onboarding_completed is distinct from true);
