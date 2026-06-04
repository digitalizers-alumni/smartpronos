create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.matches
  add column if not exists football_data_match_id integer,
  add column if not exists football_data_matchday integer,
  add column if not exists football_data_last_synced_at timestamptz;

create unique index if not exists matches_football_data_match_id_idx
  on public.matches (football_data_match_id)
  where football_data_match_id is not null;

alter table public.matches
  drop constraint if exists valid_stage;

alter table public.matches
  add constraint valid_stage check (
    stage in ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final')
  );

create table if not exists public.football_data_sync_state (
  key text primary key,
  last_football_data_fetch_at timestamptz,
  last_success_at timestamptz,
  last_response jsonb,
  updated_at timestamptz not null default now()
);

alter table public.football_data_sync_state enable row level security;

drop policy if exists "football data sync state readable by authenticated" on public.football_data_sync_state;
create policy "football data sync state readable by authenticated"
  on public.football_data_sync_state for select to authenticated using (true);

grant select on public.football_data_sync_state to authenticated;

create or replace function public.schedule_update_scores_cron(
  p_function_url text,
  p_authorization_token text,
  p_cron_expression text default '* * * * *'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(p_function_url), '') is null then
    raise exception 'p_function_url is required';
  end if;

  if nullif(btrim(p_authorization_token), '') is null then
    raise exception 'p_authorization_token is required';
  end if;

  begin
    perform cron.unschedule('sync-wc-matches-and-scores');
  exception
    when others then
      null;
  end;

  perform cron.schedule(
    'sync-wc-matches-and-scores',
    coalesce(nullif(btrim(p_cron_expression), ''), '* * * * *'),
    format(
      $cron$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $cron$,
      p_function_url,
      p_authorization_token
    )
  );
end;
$$;

revoke all on function public.schedule_update_scores_cron(text, text, text) from public;
