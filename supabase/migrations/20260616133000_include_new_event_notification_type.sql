alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('venue_update', 'new_event', 'event_reminder', 'post_comment', 'group_activity', 'reward'));
