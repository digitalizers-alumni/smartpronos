create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text not null,
  avatar_url text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from public;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.create_or_update_profile(username text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_username text;
  v_email text;
  v_profile public.profiles%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_AUTHENTICATED',
      'message', 'Utilisateur non connecté.'
    );
  end if;

  v_username := nullif(btrim($1), '');

  if v_username is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'USERNAME_REQUIRED',
      'message', 'Le pseudo est obligatoire.'
    );
  end if;

  v_email := auth.jwt() ->> 'email';

  insert into public.profiles (id, email, username)
  values (v_user_id, v_email, v_username)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        username = excluded.username
  returning *
  into v_profile;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'username', v_profile.username,
      'avatar_url', v_profile.avatar_url,
      'created_at', v_profile.created_at
    )
  );
end;
$$;

revoke all on function public.create_or_update_profile(text) from public;
grant execute on function public.create_or_update_profile(text) to authenticated;

create or replace view public.current_user_profile
with (security_invoker = true)
as
select
  profiles.id,
  profiles.email,
  profiles.username,
  profiles.avatar_url,
  null::uuid as company_id,
  null::text as company_name
from public.profiles
where profiles.id = auth.uid();

revoke all on public.current_user_profile from public;
grant select on public.current_user_profile to authenticated;
