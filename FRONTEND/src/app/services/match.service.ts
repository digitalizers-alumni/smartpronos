import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { MatchListItem } from '../shared/models/match.models';

/** Demo dataset used when the API is unreachable (local dev without backend). */
export const DEMO_MATCHES: MatchListItem[] = [
  {
    id: 'wc-2026-g1',
    kickoff: '2026-06-14T17:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe A',
    venue: 'Azteca · Mexico City',
    status: 'open',
    homeTeam: {
      name: 'Mexique',
      shortCode: 'MEX',
      flagUrl: 'https://flagcdn.com/w160/mx.png',
    },
    awayTeam: {
      name: 'Canada',
      shortCode: 'CAN',
      flagUrl: 'https://flagcdn.com/w160/ca.png',
    },
    prediction: { homeScore: 2, awayScore: 1, hasPrediction: true },
  },
  {
    id: 'wc-2026-g2',
    kickoff: '2026-06-14T20:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe B',
    venue: 'SoFi Stadium · Inglewood',
    status: 'open',
    homeTeam: {
      name: 'France',
      shortCode: 'FRA',
      flagUrl: 'https://flagcdn.com/w160/fr.png',
    },
    awayTeam: {
      name: 'Angleterre',
      shortCode: 'ENG',
      flagUrl: 'https://flagcdn.com/w160/gb-eng.png',
    },
    prediction: { homeScore: null, awayScore: null, hasPrediction: false },
  },
  {
    id: 'wc-2026-g3',
    kickoff: '2026-06-15T18:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe C',
    venue: 'Mercedes-Benz · Atlanta',
    status: 'locked',
    homeTeam: {
      name: 'Portugal',
      shortCode: 'POR',
      flagUrl: 'https://flagcdn.com/w160/pt.png',
    },
    awayTeam: {
      name: 'Maroc',
      shortCode: 'MAR',
      flagUrl: 'https://flagcdn.com/w160/ma.png',
    },
    prediction: { homeScore: 1, awayScore: 1, hasPrediction: true },
  },
  {
    id: 'wc-2026-g4',
    kickoff: '2026-06-10T16:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe D',
    venue: 'Hard Rock · Miami',
    status: 'finished',
    homeTeam: {
      name: 'Argentine',
      shortCode: 'ARG',
      flagUrl: 'https://flagcdn.com/w160/ar.png',
    },
    awayTeam: {
      name: 'États-Unis',
      shortCode: 'USA',
      flagUrl: 'https://flagcdn.com/w160/us.png',
    },
    prediction: { homeScore: 3, awayScore: 2, hasPrediction: true },
  },
];

@Injectable({ providedIn: 'root' })
export class MatchService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/matches';

  /**
   * Returns matches from the API. Falls back to {@link DEMO_MATCHES} when the request fails
   * so the liste reste utilisable sans backend local.
   */
  getMatches(): Observable<MatchListItem[]> {
    return this.http.get<MatchListItem[]>(this.endpoint).pipe(
      catchError((error: HttpErrorResponse) => {
        console.warn('[MatchService] API indisponible, données de démonstration.', error.status);
        return of(DEMO_MATCHES);
      }),
    );
  }
}
