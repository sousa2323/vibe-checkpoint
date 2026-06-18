drop policy if exists "Public can read user profiles" on public.user_profiles;
drop policy if exists "Authenticated users can read user profiles" on public.user_profiles;

create policy "Authenticated users can read user profiles"
  on public.user_profiles for select
  to authenticated
  using (true);

drop policy if exists "Public can read posts" on public.user_posts;
drop policy if exists "Authenticated users can read posts" on public.user_posts;

create policy "Authenticated users can read posts"
  on public.user_posts for select
  to authenticated
  using (true);

drop policy if exists "Public can read post media" on public.user_post_media;
drop policy if exists "Authenticated users can read post media" on public.user_post_media;

create policy "Authenticated users can read post media"
  on public.user_post_media for select
  to authenticated
  using (true);

drop policy if exists "Public can read post likes" on public.user_post_likes;
drop policy if exists "Authenticated users can read post likes" on public.user_post_likes;

create policy "Authenticated users can read post likes"
  on public.user_post_likes for select
  to authenticated
  using (true);

drop policy if exists "Public can read post comments" on public.user_post_comments;
drop policy if exists "Authenticated users can read post comments" on public.user_post_comments;

create policy "Authenticated users can read post comments"
  on public.user_post_comments for select
  to authenticated
  using (true);

drop policy if exists "Public can read event reviews" on public.event_reviews;
drop policy if exists "Authenticated users can read event reviews" on public.event_reviews;

create policy "Authenticated users can read event reviews"
  on public.event_reviews for select
  to authenticated
  using (true);
