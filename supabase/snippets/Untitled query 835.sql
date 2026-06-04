select *
from football_data_sync_state;

select id, football_data_match_id, football_data_matchday, football_data_last_synced_at
from matches
where football_data_last_synced_at is not null
order by kickoff_at
limit 20;

select *
from match_results
where last_synced_at is not null
order by last_synced_at desc;