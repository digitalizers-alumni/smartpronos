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
  order by c.country_team_id is null, cm.joined_at
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

create or replace view public.current_user_tribes as
select
  cm.company_id as tribe_id,
  c.name as tribe_name,
  c.country_team_id is not null as is_country_tribe,
  cm.joined_at
from public.company_members cm
join public.companies c on c.id = cm.company_id
where cm.user_id = auth.uid();

grant select on public.current_user_profile to authenticated;
grant select on public.current_user_tribe to authenticated;
grant select on public.current_user_tribes to authenticated;
