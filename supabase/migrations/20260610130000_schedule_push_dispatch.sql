create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'dispatch-push-notifications-every-minute') then
    perform cron.unschedule('dispatch-push-notifications-every-minute');
  end if;
end $$;

select cron.schedule(
  'dispatch-push-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://zdprudcahoplkzbdjhyn.supabase.co/functions/v1/dispatch-push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'push_dispatch_secret'
        order by updated_at desc
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
