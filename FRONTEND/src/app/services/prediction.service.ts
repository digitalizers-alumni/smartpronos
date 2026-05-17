import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import {
  PredictionPayload,
  PredictionResponse,
  PredictionSubmissionError,
} from '../shared/models/prediction.models';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/predictions';

  submitPrediction(payload: PredictionPayload): Observable<PredictionResponse> {
    return this.http
      .post<PredictionResponse>(this.endpoint, payload)
      .pipe(catchError((error) => this.handleError(error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      typeof error.error === 'object' && error.error?.['message']
        ? String(error.error['message'])
        : "Impossible d'enregistrer votre pronostic. Veuillez réessayer.";
    return throwError(() => new PredictionSubmissionError(message, error.status, error));
  }
}
