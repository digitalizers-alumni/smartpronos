import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatchListItem } from '../../shared/models/match.models';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './match-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchCard {
  readonly match = input.required<MatchListItem>();

  protected readonly predictionLine = computed(() => {
    const m = this.match();
    const { prediction } = m;
    if (!prediction.hasPrediction) {
      return 'Prono : aucun score saisi';
    }
    const home = prediction.homeScore ?? '—';
    const away = prediction.awayScore ?? '—';
    return `Prono : ${home} — ${away}`;
  });

  protected readonly predictionHint = computed(() => {
    const m = this.match();
    if (m.status === 'finished') {
      return 'Résultat final disponible dans les détails.';
    }
    if (m.status === 'locked') {
      return 'Les pronostics sont clos pour ce match.';
    }
    return 'Tu peux encore ajuster ton pronostic avant le coup d’envoi.';
  });
}
