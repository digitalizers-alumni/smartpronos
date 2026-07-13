import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatchListItem } from '../../shared/models/match.models';
import { extractRoundKey, stageLabel } from '../../shared/utils/stage-label';

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

  protected readonly isPenaltyShootout = computed(() => {
    const m = this.match();
    if (m.status !== 'finished' || !m.result) return false;
    const stageKey = extractRoundKey(m.stage);
    return stageKey !== 'group' && stageKey !== 'unknown' && m.result.homeScore === m.result.awayScore;
  });
}
