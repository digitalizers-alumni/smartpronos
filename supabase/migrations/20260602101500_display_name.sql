alter table public.profiles
  add column if not exists display_name text;

update public.profiles
set display_name = username
where display_name is null
  and username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');

  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@missing.local'),
    'user_' || substr(new.id::text, 1, 8),
    coalesce(v_display_name, 'user_' || substr(new.id::text, 1, 8))
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        display_name = coalesce(nullif(btrim(excluded.display_name), ''), public.profiles.display_name);

  return new;
end;
$$;

create or replace function public.update_display_name(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_display_name text;
  v_profile public.profiles%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  v_display_name := nullif(btrim(p_display_name), '');

  if v_display_name is null then
    return jsonb_build_object('success', false, 'error_code', 'DISPLAY_NAME_REQUIRED', 'message', 'Le nom affiché est obligatoire.');
  end if;

  if char_length(v_display_name) < 2 or char_length(v_display_name) > 40 then
    return jsonb_build_object('success', false, 'error_code', 'DISPLAY_NAME_INVALID', 'message', 'Le nom affiché doit contenir entre 2 et 40 caractères.');
  end if;

  update public.profiles
  set display_name = v_display_name
  where id = v_user_id
  returning *
  into v_profile;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_profile.id,
      'username', v_profile.username,
      'display_name', coalesce(v_profile.display_name, v_profile.username)
    )
  );
end;
$$;

create or replace view public.current_user_profile as
select
  p.id,
  p.email,
  p.username,
  p.avatar_url,
  company_data.company_id,
  company_data.company_name,
  coalesce(p.display_name, p.username) as display_name
from public.profiles p
left join lateral (
  select
    cm.company_id,
    c.name as company_name
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  where cm.user_id = p.id
  order by cm.joined_at
  limit 1
) company_data on true
where p.id = auth.uid();

create or replace view public.company_members_with_scores as
select
  cm.company_id,
  cm.user_id,
  coalesce(p.display_name, p.username) as username,
  p.avatar_url,
  coalesce(us.total_points, 0) as total_points,
  coalesce(us.exact_count, 0) as exact_count,
  cm.joined_at
from public.company_members cm
join public.profiles p on p.id = cm.user_id
left join public.user_scores us on us.user_id = cm.user_id;

create or replace view public.current_user_tribe as
select
  profile.id,
  profile.email,
  profile.username,
  profile.avatar_url,
  profile.company_id as tribe_id,
  profile.company_name as tribe_name,
  profile.display_name
from public.current_user_profile profile;

create or replace view public.tribe_members_with_scores as
select
  member.company_id as tribe_id,
  member.user_id,
  member.username,
  member.avatar_url,
  member.total_points,
  member.exact_count,
  member.joined_at
from public.company_members_with_scores member;

create or replace function public.get_global_leaderboard()
returns table (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        coalesce(us.total_points, 0) desc,
        coalesce(us.exact_count, 0) desc,
        p.id asc
    ) as rank,
    p.id as user_id,
    coalesce(p.display_name, p.username) as username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  order by rank;
$$;

create or replace function public.get_company_leaderboard(p_company_id uuid)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        coalesce(us.total_points, 0) desc,
        coalesce(us.exact_count, 0) desc,
        p.id asc
    ) as rank,
    p.id as user_id,
    coalesce(p.display_name, p.username) as username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count
  from public.company_members cm
  join public.profiles p on p.id = cm.user_id
  left join public.user_scores us on us.user_id = p.id
  where cm.company_id = p_company_id
  order by rank;
$$;

create or replace function public.get_my_company_leaderboard()
returns table (
  rank bigint,
  user_id uuid,
  username text,
  total_points bigint,
  exact_count bigint
)
language sql
security definer
set search_path = public
as $$
  with my_company as (
    select cm.company_id
    from public.company_members cm
    where cm.user_id = auth.uid()
    order by cm.joined_at asc
    limit 1
  )
  select
    row_number() over (
      order by
        coalesce(us.total_points, 0) desc,
        coalesce(us.exact_count, 0) desc,
        p.id asc
    ) as rank,
    p.id as user_id,
    coalesce(p.display_name, p.username) as username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count
  from my_company mc
  join public.company_members cm on cm.company_id = mc.company_id
  join public.profiles p on p.id = cm.user_id
  left join public.user_scores us on us.user_id = p.id
  order by rank;
$$;

create or replace function public.get_user_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_points', coalesce(us.total_points, 0),
    'exact_count', coalesce(us.exact_count, 0),
    'total_predictions', (select count(*) from public.predictions where user_id = auth.uid()),
    'rank', (select rank from public.user_ranked ur where ur.user_id = p.id),
    'favorite_team_id', p.favorite_team_id,
    'favorite_team_code', t.code,
    'favorite_team_name', coalesce(t.name_fr, t.name),
    'favorite_team_flag', t.flag_url,
    'username', p.username,
    'display_name', coalesce(p.display_name, p.username)
  )
  from public.profiles p
  left join public.user_scores us on us.user_id = p.id
  left join public.teams t on t.id = p.favorite_team_id
  where p.id = auth.uid();
$$;

grant select on public.current_user_profile to authenticated;
grant select on public.company_members_with_scores to authenticated;
grant select on public.current_user_tribe to authenticated;
grant select on public.tribe_members_with_scores to authenticated;

revoke all on function public.update_display_name(text) from public;

grant execute on function public.update_display_name(text) to authenticated;
grant execute on function public.get_global_leaderboard() to authenticated;
grant execute on function public.get_company_leaderboard(uuid) to authenticated;
grant execute on function public.get_my_company_leaderboard() to authenticated;
grant execute on function public.get_user_profile() to authenticated;
