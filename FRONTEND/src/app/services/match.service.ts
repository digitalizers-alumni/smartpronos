import { Injectable, inject } from '@angular/core';
import { Observable, from, map, first } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';
import { MatchListItem, MatchStatus } from '../shared/models/match.models';

const COMPETITION_NAME = 'Coupe du Monde 2026';
const VENUE_CITY_MATCH_THRESHOLD = 0.8;

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

function normalizeVenueWords(value: string | null | undefined): string[] {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? 0;
}

function wordSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(left, right) / maxLength;
}

function venueAlreadyIncludesCity(stadium: string | null | undefined, city: string | null | undefined): boolean {
  const stadiumWords = normalizeVenueWords(stadium);
  const cityWords = normalizeVenueWords(city);
  if (stadiumWords.length === 0 || cityWords.length === 0) return false;

  const matchedWords = cityWords.filter((cityWord) =>
    stadiumWords.some((stadiumWord) => wordSimilarity(cityWord, stadiumWord) >= VENUE_CITY_MATCH_THRESHOLD),
  );

  return matchedWords.length / cityWords.length >= VENUE_CITY_MATCH_THRESHOLD;
}

function formatVenue(row: MatchListRpcRow): string | undefined {
  const stadium = row.venue_stadium?.trim();
  const city = row.venue_city?.trim();
  const shouldShowCity = city && !venueAlreadyIncludesCity(stadium, city);
  const parts = [stadium, shouldShowCity ? city : null]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function mapRpcRowToMatchListItem(row: MatchListRpcRow): MatchListItem {
  return {
    id: row.match_id,
    fifaMatchNumber: row.fifa_match_number ?? undefined,
    kickoff: row.kickoff_at,
    competition: COMPETITION_NAME,
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
      isBoosted: row.user_is_boosted ?? false,
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
