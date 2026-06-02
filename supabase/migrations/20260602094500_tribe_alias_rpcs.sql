create or replace function public.create_tribe(p_name text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.create_company(p_name);
$$;

create or replace function public.join_tribe_by_invite_code(p_invite_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.join_company_by_invite_code(p_invite_code);
$$;

create or replace function public.leave_tribe(p_tribe_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.leave_company(p_tribe_id);
$$;

create or replace function public.get_tribes_leaderboard()
returns table (
  rank bigint,
  tribe_id uuid,
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
    board.rank,
    board.company_id as tribe_id,
    board.name,
    board.member_count,
    board.active_member_count,
    board.avg_points,
    board.total_points
  from public.get_companies_leaderboard() board;
$$;

create or replace function public.get_my_tribe_leaderboard()
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
  select *
  from public.get_my_company_leaderboard();
$$;

create or replace function public.get_my_tribe_dashboard()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.get_my_company_dashboard();
$$;

create or replace view public.current_user_tribe as
select
  profile.id,
  profile.email,
  profile.username,
  profile.avatar_url,
  profile.company_id as tribe_id,
  profile.company_name as tribe_name
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

create or replace view public.tribe_scores as
select
  score.company_id as tribe_id,
  score.member_count,
  score.active_member_count,
  score.avg_points,
  score.total_points
from public.company_scores score;

create or replace view public.tribe_invite_info as
select
  invite.company_id as tribe_id,
  invite.company_name as tribe_name,
  invite.invite_code,
  invite.member_count
from public.company_invite_info invite;

grant select on public.current_user_tribe to authenticated;
grant select on public.tribe_members_with_scores to authenticated;
grant select on public.tribe_scores to authenticated;
grant select on public.tribe_invite_info to authenticated;

revoke all on function public.create_tribe(text) from public;
revoke all on function public.join_tribe_by_invite_code(text) from public;
revoke all on function public.leave_tribe(uuid) from public;
revoke all on function public.get_tribes_leaderboard() from public;
revoke all on function public.get_my_tribe_leaderboard() from public;
revoke all on function public.get_my_tribe_dashboard() from public;

grant execute on function public.create_tribe(text) to authenticated;
grant execute on function public.join_tribe_by_invite_code(text) to authenticated;
grant execute on function public.leave_tribe(uuid) to authenticated;
grant execute on function public.get_tribes_leaderboard() to authenticated;
grant execute on function public.get_my_tribe_leaderboard() to authenticated;
grant execute on function public.get_my_tribe_dashboard() to authenticated;
