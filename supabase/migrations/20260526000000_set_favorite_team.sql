alter table public.profiles
  add column if not exists favorite_team_id uuid references public.teams(id) on delete set null;

create or replace function public.set_favorite_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_team_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  if p_team_id is not null then
    select name into v_team_name from public.teams where id = p_team_id;
    if v_team_name is null then
      return jsonb_build_object('success', false, 'error_code', 'TEAM_NOT_FOUND', 'message', 'Équipe introuvable.');
    end if;
  end if;

  update public.profiles
  set favorite_team_id = p_team_id
  where id = v_user_id;

  return jsonb_build_object('success', true, 'data', jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name));
end;
$$;

grant execute on function public.set_favorite_team(uuid) to authenticated;
