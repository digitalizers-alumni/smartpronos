import { Injectable, inject } from '@angular/core';
import { Observable, from, catchError, throwError, map } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';
import {
  PredictionPayload,
  PredictionResponse,
  PredictionSubmissionError,
} from '../shared/models/prediction.models';

interface UpsertPredictionResponse {
  success: boolean;
  error_code?: string;
  message?: string;
  data?: {
    prediction_id: string;
    match_id: string;
    home_score: number;
    away_score: number;
    is_boosted: boolean;
    updated_at: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly supabase = inject(SupabaseService);

  submitPrediction(payload: PredictionPayload): Observable<PredictionResponse> {
    const rpcPayload = {
      p_match_id: payload.matchId,
      p_home_score: payload.homeScore,
      p_away_score: payload.awayScore,
      p_is_boosted: false,
    };

    return from(this.supabase.client.rpc('upsert_prediction', rpcPayload)).pipe(
      map(({ data, error: rpcError }) => {
        if (rpcError) throw rpcError;
        const result = data as unknown as UpsertPredictionResponse;
        if (!result.success) {
          throw new PredictionSubmissionError(
            result.message ?? "Erreur inconnue",
            400,
            result,
          );
        }
        return {
          id: result.data!.prediction_id,
          matchId: result.data!.match_id,
          homeScore: result.data!.home_score,
          awayScore: result.data!.away_score,
          submittedAt: result.data!.updated_at,
        };
      }),
      catchError((error) => {
        const message =
          error instanceof PredictionSubmissionError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Impossible d'enregistrer votre pronostic. Veuillez réessayer.";
        return throwError(() => new PredictionSubmissionError(message, error?.status ?? 0, error));
      }),
    );
  }
}
