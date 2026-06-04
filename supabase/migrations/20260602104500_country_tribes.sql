alter table public.companies
  add column if not exists country_team_id uuid references public.teams(id) on delete restrict;

create unique index if not exists companies_country_team_id_unique
  on public.companies (country_team_id)
  where country_team_id is not null;

create or replace function public.seed_country_tribes()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.companies (name, created_by, country_team_id)
  select
    'Tribu ' || coalesce(t.name_fr, t.name) as name,
    null as created_by,
    t.id as country_team_id
  from public.teams t
  on conflict (country_team_id) where country_team_id is not null
  do update set name = excluded.name;
$$;

select public.seed_country_tribes();

insert into public.company_members (user_id, company_id)
select p.id, c.id
from public.profiles p
join public.companies c on c.country_team_id = p.favorite_team_id
where p.favorite_team_id is not null
on conflict (user_id, company_id) do nothing;

create or replace function public.set_favorite_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_team_name text;
  v_country_company_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  if p_team_id is not null then
    select coalesce(name_fr, name)
    into v_team_name
    from public.teams
    where id = p_team_id;

    if v_team_name is null then
      return jsonb_build_object('success', false, 'error_code', 'TEAM_NOT_FOUND', 'message', 'Équipe introuvable.');
    end if;
  end if;

  update public.profiles
  set favorite_team_id = p_team_id
  where id = v_user_id;

  if p_team_id is not null then
    perform public.seed_country_tribes();

    select c.id
    into v_country_company_id
    from public.companies c
    where c.country_team_id = p_team_id;

    if v_country_company_id is not null then
      insert into public.company_members (user_id, company_id)
      values (v_user_id, v_country_company_id)
      on conflict (user_id, company_id) do nothing;
    end if;
  end if;

  return jsonb_build_object('success', true, 'data', jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name));
end;
$$;

create or replace function public.leave_company(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_deleted_count integer;
  v_is_country_tribe boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_AUTHENTICATED',
      'message', 'Utilisateur non connecté.'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_REQUIRED',
      'message', 'Tribu manquante.'
    );
  end if;

  select c.country_team_id is not null
  into v_is_country_tribe
  from public.companies c
  where c.id = p_company_id;

  if coalesce(v_is_country_tribe, false) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COUNTRY_TRIBE_REQUIRED',
      'message', 'Tu ne peux pas quitter la tribu de ton pays.'
    );
  end if;

  delete from public.company_members
  where user_id = v_user_id
    and company_id = p_company_id;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_COMPANY_MEMBER',
      'message', 'Tu ne fais pas partie de cette tribu.'
    );
  end if;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.join_company_by_invite_code(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_company public.companies%rowtype;
  v_membership_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  select *
  into v_company
  from public.companies
  where invite_code = upper(nullif(btrim(p_invite_code), ''));

  if v_company.id is null then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_INVITE_CODE', 'message', 'Ce lien d’invitation est invalide.');
  end if;

  if v_company.country_team_id is not null then
    return jsonb_build_object('success', false, 'error_code', 'COUNTRY_TRIBE_AUTO_JOIN_ONLY', 'message', 'Cette tribu est liée à un pays et se rejoint via le choix du pays.');
  end if;

  insert into public.company_members (user_id, company_id)
  values (v_user_id, v_company.id)
  on conflict (user_id, company_id) do nothing
  returning id into v_membership_id;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'company_id', v_company.id,
      'company_name', v_company.name,
      'membership_status', case when v_membership_id is null then 'already_member' else 'joined' end
    )
  );
end;
$$;

drop policy if exists "users leave a company" on public.company_members;

create policy "users leave a company"
  on public.company_members for delete to authenticated
  using (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.companies c
      where c.id = company_members.company_id
        and c.country_team_id is not null
    )
  );

create or replace function public.get_companies_leaderboard()
returns table (
  rank bigint,
  company_id uuid,
  name text,
  member_count bigint,
  active_member_count bigint,
  avg_points numeric,
  total_points bigint
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        coalesce(cs.avg_points, 0) desc,
        c.id asc
    ) as rank,
    c.id as company_id,
    c.name,
    coalesce(cs.member_count, 0)::bigint as member_count,
    coalesce(cs.active_member_count, 0)::bigint as active_member_count,
    coalesce(cs.avg_points, 0) as avg_points,
    coalesce(cs.total_points, 0)::bigint as total_points
  from public.companies c
  left join public.company_scores cs on cs.company_id = c.id
  where coalesce(cs.member_count, 0) > 0
  order by rank;
$$;

create or replace view public.current_user_profile as
select
  p.id,
  p.email,
  p.username,
  p.avatar_url,
  company_data.company_id,
  company_data.company_name,
  coalesce(p.display_name, p.username) as display_name,
  company_data.company_is_country_tribe
from public.profiles p
left join lateral (
  select
    cm.company_id,
    c.name as company_name,
    c.country_team_id is not null as company_is_country_tribe
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  where cm.user_id = p.id
  order by cm.joined_at
  limit 1
) company_data on true
where p.id = auth.uid();

create or replace view public.current_user_tribe as
select
  profile.id,
  profile.email,
  profile.username,
  profile.avatar_url,
  profile.company_id as tribe_id,
  profile.company_name as tribe_name,
  profile.display_name,
  profile.company_is_country_tribe as is_country_tribe
from public.current_user_profile profile;

create or replace view public.tribe_invite_info as
select
  invite.company_id as tribe_id,
  invite.company_name as tribe_name,
  invite.invite_code,
  invite.member_count,
  c.country_team_id is not null as is_country_tribe
from public.company_invite_info invite
join public.companies c on c.id = invite.company_id;

grant select on public.current_user_profile to authenticated;
grant select on public.current_user_tribe to authenticated;
grant select on public.tribe_invite_info to authenticated;

grant execute on function public.seed_country_tribes() to authenticated;
grant execute on function public.set_favorite_team(uuid) to authenticated;
grant execute on function public.leave_company(uuid) to authenticated;
grant execute on function public.join_company_by_invite_code(text) to authenticated;
grant execute on function public.get_companies_leaderboard() to authenticated;
