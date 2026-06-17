-- Remove execução direta via Supabase RPC/API de funções internas.
-- O backend server-side continua executando por conexão privilegiada.

revoke execute on function public.generate_redemption_code() from public, anon, authenticated;
revoke execute on function public.claim_reward_redemption(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.redeem_reward_code(text, text) from public, anon, authenticated;
revoke execute on function public.materialize_due_event_reminders() from public, anon, authenticated;
revoke execute on function public.cleanup_user_data_on_auth_delete() from public, anon, authenticated;
