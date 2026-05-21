import { Injectable, inject } from '@angular/core';
import { Observable, from, catchError, of, map, first } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';
import { MatchListItem, MatchStatus } from '../shared/models/match.models';
import { DEMO_MATCHES } from '../shared/utils/demo-data';

interface MatchListRpcRow {
  match_id: string;
  home_team_name: string;
  home_team_code: string;
  home_team_flag: string | null;
  away_team_name: string;
  away_team_code: string;
  away_team_flag: string | null;
  kickoff_at: string;
  stage: string;
  status: MatchStatus;
  user_home_score: number | null;
  user_away_score: number | null;
  user_is_boosted: boolean | null;
  result_home_score: number | null;
  result_away_score: number | null;
}

function mapRpcRowToMatchListItem(row: MatchListRpcRow): MatchListItem {
  return {
    id: row.match_id,
    kickoff: row.kickoff_at,
    stage: row.stage,
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
      catchError((error) => {
        console.warn('[MatchService] Supabase indisponible, données de démonstration.', error);
        return of(DEMO_MATCHES);
      }),
    );
  }
}
