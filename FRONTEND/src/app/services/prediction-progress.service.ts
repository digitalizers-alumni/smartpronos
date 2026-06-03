import { Injectable, computed, inject, signal } from '@angular/core';
import { from } from 'rxjs';

import { SupabaseService } from '../core/services/supabase.service';

interface PredictionProgressRow {
  predicted_matches: number | string;
  total_matches: number | string;
}

@Injectable({ providedIn: 'root' })
export class PredictionProgressService {
  private readonly supabase = inject(SupabaseService);

  private readonly predictedMatches = signal(0);
  private readonly totalMatches = signal(0);

  readonly label = computed(() => `${this.predictedMatches()} / ${this.totalMatches()}`);
  readonly widthPercent = computed(() => {
    const total = this.totalMatches();
    if (total <= 0) return 0;
    return Math.min(100, Math.round((this.predictedMatches() / total) * 100));
  });

  refresh(): void {
    from(this.supabase.client.rpc('get_prediction_progress')).subscribe({
      next: ({ data, error }) => {
        if (error) {
          console.error('[PredictionProgressService] Impossible de charger la progression.', error);
          this.reset();
          return;
        }
        const row = Array.isArray(data)
          ? (data[0] as PredictionProgressRow | undefined)
          : (data as PredictionProgressRow | null);
        this.predictedMatches.set(Number(row?.predicted_matches ?? 0));
        this.totalMatches.set(Number(row?.total_matches ?? 0));
      },
      error: (err) => {
        console.error('[PredictionProgressService] Impossible de charger la progression.', err);
        this.predictedMatches.set(0);
        this.totalMatches.set(0);
      },
    });
  }

  reset(): void {
    this.predictedMatches.set(0);
    this.totalMatches.set(0);
  }
}
