import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { MatchListItem } from '../shared/models/match.models';
import { DEMO_MATCHES } from '../shared/utils/demo-data';

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
