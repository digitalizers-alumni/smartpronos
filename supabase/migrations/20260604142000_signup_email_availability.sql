create or replace function public.email_is_available(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where lower(p.email) = lower(nullif(btrim(p_email), ''))
  );
$$;

revoke all on function public.email_is_available(text) from public;
grant execute on function public.email_is_available(text) to anon, authenticated;
