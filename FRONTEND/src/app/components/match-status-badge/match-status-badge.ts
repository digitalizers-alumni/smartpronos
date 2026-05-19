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
        return 'Ouvert';
      case 'locked':
        return 'Verrouillé';
      case 'finished':
        return 'Terminé';
      default:
        return '';
    }
  }
}
