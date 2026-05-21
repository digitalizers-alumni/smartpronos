import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap, of, catchError } from 'rxjs';

import { MatchListItem, MatchStatus } from '../../../shared/models/match.models';
import { MatchService } from '../../../services/match.service';
import { MatchStatusBadge } from '../../../components/match-status-badge/match-status-badge';

@Component({
  selector: 'app-match-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink, MatchStatusBadge],
  templateUrl: './match-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly matchService = inject(MatchService);

  protected readonly loading = signal(true);
  protected readonly match = signal<MatchListItem | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('matchId')),
        switchMap((id) => {
          if (!id) {
            this.error.set('Match introuvable');
            this.loading.set(false);
            return of(null);
          }
          return this.matchService.getMatchById(id).pipe(
            catchError(() => {
              this.error.set('Impossible de charger les détails du match');
              this.loading.set(false);
              return of(null);
            }),
          );
        }),
      )
      .subscribe((m) => {
        if (m) {
          this.match.set(m);
        }
        this.loading.set(false);
      });
  }

  protected readonly isFinished = computed(() => this.match()?.status === 'finished');
  protected readonly isLocked = computed(() => this.match()?.status === 'locked');
  protected readonly isScheduled = computed(() => this.match()?.status === 'scheduled');
  protected readonly hasPrediction = computed(() => this.match()?.prediction.hasPrediction ?? false);
  protected readonly pageTitle = computed(() => {
    const m = this.match();
    if (!m) return '';
    return `${m.homeTeam.shortCode} - ${m.awayTeam.shortCode}`;
  });
}
