-- Inspired by the avatar_service_role_grants pattern
grant select on public.teams to service_role;
grant select on public.team_external_mappings to service_role;
grant select, insert, update on public.matches to service_role;
grant select, insert, update on public.match_results to service_role;
grant select, insert on public.match_alerts to service_role;
grant select, insert, update on public.football_data_sync_state to service_role;

-- Security: restrict set_match_result to service_role only
revoke execute on function public.set_match_result(uuid, integer, integer) from authenticated;
