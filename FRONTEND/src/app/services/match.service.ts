import { Injectable, inject } from '@angular/core';
import { Observable, from, map, first } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';
import { MatchListItem, MatchStatus } from '../shared/models/match.models';

interface MatchListRpcRow {
  match_id: string;
  fifa_match_number: number | null;
  home_team_name: string;
  home_team_code: string;
  home_team_flag: string | null;
  away_team_name: string;
  away_team_code: string;
  away_team_flag: string | null;
  kickoff_at: string;
  stage: string;
  group_name: string | null;
  venue_city: string | null;
  venue_stadium: string | null;
  venue_country: string | null;
  local_kickoff_time: string | null;
  local_timezone: string | null;
  status: MatchStatus;
  user_home_score: number | null;
  user_away_score: number | null;
  user_is_boosted: boolean | null;
  result_home_score: number | null;
  result_away_score: number | null;
  points_earned: number | null;
}

function formatVenue(row: MatchListRpcRow): string | undefined {
  const parts = [row.venue_stadium, row.venue_city]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function mapRpcRowToMatchListItem(row: MatchListRpcRow): MatchListItem {
  return {
    id: row.match_id,
    fifaMatchNumber: row.fifa_match_number ?? undefined,
    kickoff: row.kickoff_at,
    competition: 'Coupe du Monde 2026',
    stage: row.stage,
    group: row.group_name ?? undefined,
    venue: formatVenue(row),
    venueCity: row.venue_city ?? undefined,
    venueStadium: row.venue_stadium ?? undefined,
    venueCountry: row.venue_country ?? undefined,
    localKickoffTime: row.local_kickoff_time ?? undefined,
    localTimezone: row.local_timezone ?? undefined,
    status: row.status,
    homeTeam: {
      name: row.home_team_name,
      shortCode: row.home_team_code,
      flagUrl: row.home_team_flag ?? undefined,
    },
    awayTeam: {
      name: row.away_team_name,
      shortCode: row.away_team_code,
      flagUrl: row.away_team_flag ?? undefined,
    },
    prediction: {
      homeScore: row.user_home_score,
      awayScore: row.user_away_score,
      hasPrediction: row.user_home_score !== null,
    },
    result: row.result_home_score != null && row.result_away_score != null
      ? { homeScore: row.result_home_score, awayScore: row.result_away_score }
      : undefined,
    pointsEarned: row.points_earned ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  private readonly supabase = inject(SupabaseService);

  getMatchById(id: string): Observable<MatchListItem | null> {
    return this.getMatches().pipe(
      map((matches) => matches.find((m) => m.id === id) ?? null),
      first(),
    );
  }

  getMatches(): Observable<MatchListItem[]> {
    return from(this.supabase.client.rpc('get_match_list')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const rows = data as unknown as MatchListRpcRow[];
        return rows.map(mapRpcRowToMatchListItem);
      }),
    );
  }
}
