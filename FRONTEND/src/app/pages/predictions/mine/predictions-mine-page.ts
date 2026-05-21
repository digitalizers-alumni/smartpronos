import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { MatchListItem } from '../../../shared/models/match.models';
import { MatchService } from '../../../services/match.service';
import { MatchStatusBadge } from '../../../components/match-status-badge/match-status-badge';

@Component({
  selector: 'app-predictions-mine-page',
  standalone: true,
  imports: [DatePipe, RouterLink, MatchStatusBadge],
  templateUrl: './predictions-mine-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionsMinePage {
  private readonly matchService = inject(MatchService);

  protected readonly loading = signal(true);
  protected readonly matches = signal<MatchListItem[]>([]);

  protected readonly myPredictions = computed(() =>
    this.matches()
      .filter((m) => m.prediction.hasPrediction)
      .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime()),
  );

  constructor() {
    this.matchService
      .getMatches()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rows) => {
          this.matches.set(rows);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  protected computedPoints(m: MatchListItem): number {
    if (!m.result || !m.prediction.hasPrediction) return 0;
    const { homeScore: rh, awayScore: ra } = m.result;
    const { homeScore: ph, awayScore: pa } = m.prediction;
    if (ph === null || pa === null) return 0;
    if (ph === rh && pa === ra) return 3;
    const outcome = rh > ra ? 'H' : rh < ra ? 'A' : 'D';
    const predOutcome = ph > pa ? 'H' : ph < pa ? 'A' : 'D';
    return outcome === predOutcome ? 1 : 0;
  }
}
