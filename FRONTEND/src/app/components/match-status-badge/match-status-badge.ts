import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { MatchStatus } from '../../shared/models/match.models';

@Component({
  selector: 'app-match-status-badge',
  standalone: true,
  templateUrl: './match-status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchStatusBadge {
  readonly status = input.required<MatchStatus>();

  protected label(): string {
    switch (this.status()) {
      case 'scheduled':
        return 'À pronostiquer';
      case 'locked':
        return 'Pronos clos';
      case 'finished':
        return 'Match joué';
      default:
        return '';
    }
  }
}
