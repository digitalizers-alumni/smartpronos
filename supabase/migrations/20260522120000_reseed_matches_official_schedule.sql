begin;

alter table public.matches
  add column if not exists fifa_match_number integer,
  add column if not exists venue_city text,
  add column if not exists venue_stadium text,
  add column if not exists venue_country text,
  add column if not exists local_kickoff_time text,
  add column if not exists local_timezone text;

create unique index if not exists matches_fifa_match_number_idx
  on public.matches (fifa_match_number)
  where fifa_match_number is not null;

with raw_lines (line) as (
  select *
  from regexp_split_to_table($match_csv$1;Jeu. 11 Juin;Groupe A;Mexique;Afrique du Sud;21:00;14:00;CDT (UTC-5);Mexico City;Stade de Mexico;Mexique
2;Ven. 12 Juin;Groupe A;Corée du Sud;Tchéquie;04:00;21:00;CDT (UTC-5);Guadalajara;Stade de Guadalajara;Mexique
3;Ven. 12 Juin;Groupe B;Canada;Bosnie-Herzégovine;21:00;15:00;EDT (UTC-4);Toronto;Stade de Toronto;Canada
4;Sam. 13 Juin;Groupe D;USA;Paraguay;03:00;18:00;PDT (UTC-7);Los Angeles;Stade de Los Angeles;USA
8;Sam. 13 Juin;Groupe B;Qatar;Suisse;21:00;12:00;PDT (UTC-7);San Francisco;Stade de la baie de San Francisco;USA
7;Dim. 14 Juin;Groupe C;Brésil;Maroc;00:00;18:00;EDT (UTC-4);New York/New Jersey;Stade de New York/New Jersey;USA
5;Dim. 14 Juin;Groupe C;Haïti;Écosse;03:00;21:00;EDT (UTC-4);Boston;Stade de Boston;USA
6;Dim. 14 Juin;Groupe D;Australie;Turquie;06:00;21:00;PDT (UTC-7);Vancouver;BC Place de Vancouver;Canada
10;Dim. 14 Juin;Groupe E;Allemagne;Curaçao;19:00;12:00;CDT (UTC-5);Houston;Stade de Houston;USA
11;Dim. 14 Juin;Groupe F;Pays-Bas;Japon;22:00;15:00;CDT (UTC-5);Dallas;Stade de Dallas;USA
9;Lun. 15 Juin;Groupe E;Côte d'Ivoire;Équateur;01:00;19:00;EDT (UTC-4);Philadelphia;Stade de Philadelphie;USA
12;Lun. 15 Juin;Groupe F;Suède;Tunisie;04:00;21:00;CDT (UTC-5);Monterrey;Stade de Monterrey;Mexique
14;Lun. 15 Juin;Groupe H;Espagne;Cap-Vert;18:00;12:00;EDT (UTC-4);Atlanta;Stade d'Atlanta;USA
16;Lun. 15 Juin;Groupe G;Belgique;Égypte;21:00;12:00;PDT (UTC-7);Seattle;Stade de Seattle;USA
13;Mar. 16 Juin;Groupe H;Arabie Saoudite;Uruguay;00:00;18:00;EDT (UTC-4);Miami;Stade de Miami;USA
15;Mar. 16 Juin;Groupe G;Iran;Nouvelle-Zélande;03:00;18:00;PDT (UTC-7);Los Angeles;Stade de Los Angeles;USA
17;Mar. 16 Juin;Groupe I;France;Sénégal;21:00;15:00;EDT (UTC-4);New York/New Jersey;Stade de New York/New Jersey;USA
18;Mer. 17 Juin;Groupe I;Irak;Norvège;00:00;18:00;EDT (UTC-4);Boston;Stade de Boston;USA
19;Mer. 17 Juin;Groupe J;Argentine;Algérie;03:00;20:00;CDT (UTC-5);Kansas City;Stade de Kansas City;USA
20;Mer. 17 Juin;Groupe J;Autriche;Jordanie;06:00;21:00;PDT (UTC-7);San Francisco;Stade de la baie de San Francisco;USA
23;Mer. 17 Juin;Groupe K;Portugal;RD Congo;19:00;12:00;CDT (UTC-5);Houston;Stade de Houston;USA
22;Mer. 17 Juin;Groupe L;Angleterre;Croatie;22:00;15:00;CDT (UTC-5);Dallas;Stade de Dallas;USA
21;Jeu. 18 Juin;Groupe L;Ghana;Panama;01:00;19:00;EDT (UTC-4);Toronto;Stade de Toronto;Canada
24;Jeu. 18 Juin;Groupe K;Ouzbékistan;Colombie;04:00;21:00;CDT (UTC-5);Mexico City;Stade de Mexico;Mexique
25;Jeu. 18 Juin;Groupe A;Tchéquie;Afrique du Sud;18:00;12:00;EDT (UTC-4);Atlanta;Stade d'Atlanta;USA
26;Jeu. 18 Juin;Groupe B;Suisse;Bosnie-Herzégovine;21:00;12:00;PDT (UTC-7);Los Angeles;Stade de Los Angeles;USA
27;Ven. 19 Juin;Groupe B;Canada;Qatar;00:00;15:00;PDT (UTC-7);Vancouver;BC Place de Vancouver;Canada
28;Ven. 19 Juin;Groupe A;Mexique;Corée du Sud;03:00;20:00;CDT (UTC-5);Guadalajara;Stade de Guadalajara;Mexique
32;Ven. 19 Juin;Groupe D;USA;Australie;21:00;12:00;PDT (UTC-7);Seattle;Stade de Seattle;USA
30;Sam. 20 Juin;Groupe C;Écosse;Maroc;00:00;18:00;EDT (UTC-4);Boston;Stade de Boston;USA
29;Sam. 20 Juin;Groupe C;Brésil;Haïti;02:30;20:30;EDT (UTC-4);Philadelphia;Stade de Philadelphie;USA
31;Sam. 20 Juin;Groupe D;Turquie;Paraguay;05:00;20:00;PDT (UTC-7);San Francisco;Stade de la baie de San Francisco;USA
35;Sam. 20 Juin;Groupe F;Pays-Bas;Suède;19:00;12:00;CDT (UTC-5);Houston;Stade de Houston;USA
33;Sam. 20 Juin;Groupe E;Allemagne;Côte d'Ivoire;22:00;16:00;EDT (UTC-4);Toronto;Stade de Toronto;Canada
34;Dim. 21 Juin;Groupe E;Équateur;Curaçao;02:00;19:00;CDT (UTC-5);Kansas City;Stade de Kansas City;USA
36;Dim. 21 Juin;Groupe F;Tunisie;Japon;06:00;23:00;CDT (UTC-5);Monterrey;Stade de Monterrey;Mexique
38;Dim. 21 Juin;Groupe H;Espagne;Arabie Saoudite;18:00;12:00;EDT (UTC-4);Atlanta;Stade d'Atlanta;USA
39;Dim. 21 Juin;Groupe G;Belgique;Iran;21:00;12:00;PDT (UTC-7);Los Angeles;Stade de Los Angeles;USA
37;Lun. 22 Juin;Groupe H;Uruguay;Cap-Vert;00:00;18:00;EDT (UTC-4);Miami;Stade de Miami;USA
40;Lun. 22 Juin;Groupe G;Nouvelle-Zélande;Égypte;03:00;18:00;PDT (UTC-7);Vancouver;BC Place de Vancouver;Canada
43;Lun. 22 Juin;Groupe J;Argentine;Autriche;19:00;12:00;CDT (UTC-5);Dallas;Stade de Dallas;USA
42;Lun. 22 Juin;Groupe I;France;Irak;23:00;17:00;EDT (UTC-4);Philadelphia;Stade de Philadelphie;USA
41;Mar. 23 Juin;Groupe I;Norvège;Sénégal;02:00;20:00;EDT (UTC-4);New York/New Jersey;Stade de New York/New Jersey;USA
44;Mar. 23 Juin;Groupe J;Jordanie;Algérie;05:00;20:00;PDT (UTC-7);San Francisco;Stade de la baie de San Francisco;USA
47;Mar. 23 Juin;Groupe K;Portugal;Ouzbékistan;19:00;12:00;CDT (UTC-5);Houston;Stade de Houston;USA
45;Mar. 23 Juin;Groupe L;Angleterre;Ghana;22:00;16:00;EDT (UTC-4);Boston;Stade de Boston;USA
46;Mer. 24 Juin;Groupe L;Panama;Croatie;01:00;19:00;EDT (UTC-4);Toronto;Stade de Toronto;Canada
48;Mer. 24 Juin;Groupe K;Colombie;RD Congo;04:00;21:00;CDT (UTC-5);Guadalajara;Stade de Guadalajara;Mexique
51;Mer. 24 Juin;Groupe B;Suisse;Canada;21:00;12:00;PDT (UTC-7);Vancouver;BC Place de Vancouver;Canada
52;Mer. 24 Juin;Groupe B;Bosnie-Herzégovine;Qatar;21:00;12:00;PDT (UTC-7);Seattle;Stade de Seattle;USA
49;Jeu. 25 Juin;Groupe C;Écosse;Brésil;00:00;18:00;EDT (UTC-4);Miami;Stade de Miami;USA
50;Jeu. 25 Juin;Groupe C;Maroc;Haïti;00:00;18:00;EDT (UTC-4);Atlanta;Stade d'Atlanta;USA
53;Jeu. 25 Juin;Groupe A;Tchéquie;Mexique;03:00;20:00;CDT (UTC-5);Mexico City;Stade de Mexico;Mexique
54;Jeu. 25 Juin;Groupe A;Afrique du Sud;Corée du Sud;03:00;20:00;CDT (UTC-5);Monterrey;Stade de Monterrey;Mexique
55;Jeu. 25 Juin;Groupe E;Curaçao;Côte d'Ivoire;22:00;16:00;EDT (UTC-4);Philadelphia;Stade de Philadelphie;USA
56;Jeu. 25 Juin;Groupe E;Équateur;Allemagne;22:00;16:00;EDT (UTC-4);New York/New Jersey;Stade de New York/New Jersey;USA
57;Ven. 26 Juin;Groupe F;Japon;Suède;01:00;18:00;CDT (UTC-5);Dallas;Stade de Dallas;USA
58;Ven. 26 Juin;Groupe F;Tunisie;Pays-Bas;01:00;18:00;CDT (UTC-5);Kansas City;Stade de Kansas City;USA
59;Ven. 26 Juin;Groupe D;Turquie;USA;04:00;19:00;PDT (UTC-7);Los Angeles;Stade de Los Angeles;USA
60;Ven. 26 Juin;Groupe D;Paraguay;Australie;04:00;19:00;PDT (UTC-7);San Francisco;Stade de la baie de San Francisco;USA
61;Ven. 26 Juin;Groupe I;Norvège;France;21:00;15:00;EDT (UTC-4);Boston;Stade de Boston;USA
62;Ven. 26 Juin;Groupe I;Sénégal;Irak;21:00;15:00;EDT (UTC-4);Toronto;Stade de Toronto;Canada
65;Sam. 27 Juin;Groupe H;Cap-Vert;Arabie Saoudite;02:00;19:00;CDT (UTC-5);Houston;Stade de Houston;USA
66;Sam. 27 Juin;Groupe H;Uruguay;Espagne;02:00;19:00;CDT (UTC-5);Guadalajara;Stade de Guadalajara;Mexique
63;Sam. 27 Juin;Groupe G;Égypte;Iran;05:00;20:00;PDT (UTC-7);Seattle;Stade de Seattle;USA
64;Sam. 27 Juin;Groupe G;Nouvelle-Zélande;Belgique;05:00;20:00;PDT (UTC-7);Vancouver;BC Place de Vancouver;Canada
67;Sam. 27 Juin;Groupe L;Panama;Angleterre;23:00;17:00;EDT (UTC-4);New York/New Jersey;Stade de New York/New Jersey;USA
68;Sam. 27 Juin;Groupe L;Croatie;Ghana;23:00;17:00;EDT (UTC-4);Philadelphia;Stade de Philadelphie;USA
71;Dim. 28 Juin;Groupe K;Colombie;Portugal;01:30;19:30;EDT (UTC-4);Miami;Stade de Miami;USA
72;Dim. 28 Juin;Groupe K;RD Congo;Ouzbékistan;01:30;19:30;EDT (UTC-4);Atlanta;Stade d'Atlanta;USA
69;Dim. 28 Juin;Groupe J;Algérie;Autriche;04:00;21:00;CDT (UTC-5);Kansas City;Stade de Kansas City;USA
70;Dim. 28 Juin;Groupe J;Jordanie;Argentine;04:00;21:00;CDT (UTC-5);Dallas;Stade de Dallas;USA$match_csv$, E'\n')
),
match_source as (
  select
    fields[1]::integer as fifa_match_number,
    regexp_replace(fields[3], '^Groupe ', '') as group_name,
    fields[4] as home_team_name_fr,
    fields[5] as away_team_name_fr,
    make_timestamptz(
      2026,
      case split_part(fields[2], ' ', 3)
        when 'Juin' then 6
        when 'Juillet' then 7
      end,
      split_part(fields[2], ' ', 2)::integer,
      split_part(fields[6], ':', 1)::integer,
      split_part(fields[6], ':', 2)::integer,
      0,
      'Europe/Zurich'
    ) as kickoff_at,
    fields[7] as local_kickoff_time,
    fields[8] as local_timezone,
    fields[9] as venue_city,
    fields[10] as venue_stadium,
    fields[11] as venue_country
  from (
    select string_to_array(line, ';') as fields
    from raw_lines
    where nullif(btrim(line), '') is not null
  ) parsed
),
resolved_source as (
  select
    ms.*,
    home_team.id as home_team_id,
    away_team.id as away_team_id
  from match_source ms
  join public.teams home_team
    on home_team.name_fr = ms.home_team_name_fr
    or (ms.home_team_name_fr = 'USA' and home_team.name = 'United States')
  join public.teams away_team
    on away_team.name_fr = ms.away_team_name_fr
    or (ms.away_team_name_fr = 'USA' and away_team.name = 'United States')
)
update public.matches m
set
  fifa_match_number = rs.fifa_match_number,
  kickoff_at = rs.kickoff_at,
  group_name = rs.group_name,
  venue_city = rs.venue_city,
  venue_stadium = rs.venue_stadium,
  venue_country = rs.venue_country,
  local_kickoff_time = rs.local_kickoff_time,
  local_timezone = rs.local_timezone
from resolved_source rs
where m.home_team_id = rs.home_team_id
  and m.away_team_id = rs.away_team_id
  and m.stage = 'group';

do $$
begin
  if (select count(*) from public.matches where stage = 'group' and fifa_match_number is not null) <> 72 then
    raise exception 'Official match reseed expected 72 group matches with fifa_match_number.';
  end if;
end;
$$;

drop function if exists public.get_match_list();

drop view if exists public.matches_with_status;

create or replace view public.matches_with_status as
select
  m.id,
  m.home_team_id,
  m.away_team_id,
  m.kickoff_at,
  m.stage,
  m.group_name,
  m.fifa_match_number,
  m.venue_city,
  m.venue_stadium,
  m.venue_country,
  m.local_kickoff_time,
  m.local_timezone,
  m.created_at,
  case
    when exists (
      select 1
      from public.match_results mr
      where mr.match_id = m.id
    ) then 'finished'
    when now() >= m.kickoff_at - interval '15 minutes' then 'locked'
    else 'scheduled'
  end as status
from public.matches m;

grant select on public.matches_with_status to authenticated;

create or replace function public.get_match_list()
returns table (
  match_id uuid,
  fifa_match_number integer,
  home_team_name text,
  home_team_code text,
  home_team_flag text,
  away_team_name text,
  away_team_code text,
  away_team_flag text,
  kickoff_at timestamptz,
  stage text,
  group_name text,
  venue_city text,
  venue_stadium text,
  venue_country text,
  local_kickoff_time text,
  local_timezone text,
  status text,
  user_home_score integer,
  user_away_score integer,
  user_is_boosted boolean,
  result_home_score integer,
  result_away_score integer
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.fifa_match_number,
    ht.name,
    ht.code,
    ht.flag_url,
    at.name,
    at.code,
    at.flag_url,
    m.kickoff_at,
    m.stage,
    m.group_name,
    m.venue_city,
    m.venue_stadium,
    m.venue_country,
    m.local_kickoff_time,
    m.local_timezone,
    m.status,
    p.home_score,
    p.away_score,
    p.is_boosted,
    mr.home_score,
    mr.away_score
  from public.matches_with_status m
  join public.teams ht on ht.id = m.home_team_id
  join public.teams at on at.id = m.away_team_id
  left join public.predictions p
    on p.match_id = m.id
   and p.user_id = auth.uid()
  left join public.match_results mr on mr.match_id = m.id
  order by m.kickoff_at asc;
$$;

grant execute on function public.get_match_list() to authenticated;

commit;
