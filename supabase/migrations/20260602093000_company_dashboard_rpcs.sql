create or replace function public.leave_company(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_deleted_count integer;
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
    p.username,
    coalesce(us.total_points, 0)::bigint as total_points,
    coalesce(us.exact_count, 0)::bigint as exact_count
  from my_company mc
  join public.company_members cm on cm.company_id = mc.company_id
  join public.profiles p on p.id = cm.user_id
  left join public.user_scores us on us.user_id = p.id
  order by rank;
$$;

create or replace function public.get_my_company_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_company_id uuid;
  v_company_name text;
  v_invite_code text;
  v_rank bigint;
  v_total_tribes bigint;
  v_member_count bigint;
  v_active_member_count bigint;
  v_avg_points numeric;
  v_total_points bigint;
  v_members jsonb;
  v_rival jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_AUTHENTICATED',
      'message', 'Utilisateur non connecté.'
    );
  end if;

  select cm.company_id, c.name, c.invite_code
  into v_company_id, v_company_name, v_invite_code
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  where cm.user_id = v_user_id
  order by cm.joined_at asc
  limit 1;

  if v_company_id is null then
    return jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'company', null,
        'members', jsonb_build_array(),
        'rival', null
      )
    );
  end if;

  select
    board.rank,
    board.member_count,
    board.active_member_count,
    board.avg_points,
    board.total_points
  into
    v_rank,
    v_member_count,
    v_active_member_count,
    v_avg_points,
    v_total_points
  from public.get_companies_leaderboard() board
  where board.company_id = v_company_id;

  select count(*)
  into v_total_tribes
  from public.get_companies_leaderboard();

  select jsonb_agg(
    jsonb_build_object(
      'rank', ranked.rank,
      'user_id', ranked.user_id,
      'username', ranked.username,
      'total_points', ranked.total_points,
      'exact_count', ranked.exact_count
    )
    order by ranked.rank
  )
  into v_members
  from public.get_my_company_leaderboard() ranked;

  with board as (
    select *
    from public.get_companies_leaderboard()
  )
  select jsonb_build_object(
    'rank', b.rank,
    'company_id', b.company_id,
    'name', b.name,
    'member_count', b.member_count,
    'active_member_count', b.active_member_count,
    'avg_points', b.avg_points,
    'total_points', b.total_points,
    'gap_avg_points', greatest(0, coalesce(b.avg_points, 0) - coalesce(v_avg_points, 0))
  )
  into v_rival
  from board b
  where b.rank = v_rank - 1
  limit 1;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'company', jsonb_build_object(
        'company_id', v_company_id,
        'name', v_company_name,
        'invite_code', v_invite_code,
        'invite_url_path', '/join/' || v_invite_code,
        'rank', v_rank,
        'total_tribes', coalesce(v_total_tribes, 0),
        'member_count', coalesce(v_member_count, 0),
        'active_member_count', coalesce(v_active_member_count, 0),
        'avg_points', coalesce(v_avg_points, 0),
        'total_points', coalesce(v_total_points, 0)
      ),
      'members', coalesce(v_members, jsonb_build_array()),
      'rival', v_rival
    )
  );
end;
$$;

revoke all on function public.leave_company(uuid) from public;
revoke all on function public.get_my_company_leaderboard() from public;
revoke all on function public.get_my_company_dashboard() from public;

grant execute on function public.leave_company(uuid) to authenticated;
grant execute on function public.get_my_company_leaderboard() to authenticated;
grant execute on function public.get_my_company_dashboard() to authenticated;
