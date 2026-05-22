import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatchListItem } from '../../shared/models/match.models';
import { stageLabel } from '../../shared/utils/stage-label';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './match-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchCard {
  readonly match = input.required<MatchListItem>();

  protected readonly stageLabel = computed(() => stageLabel(this.match().stage));
}
