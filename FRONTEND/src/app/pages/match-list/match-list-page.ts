import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatchCard } from '../../components/match-card/match-card';
import { MatchListItem, MatchStatus } from '../../shared/models/match.models';
import { MatchService } from '../../services/match.service';

export type MatchStatusFilter = 'all' | MatchStatus;

export interface MatchDateGroup {
  dateKey: string;
  labelDate: string;
  matches: MatchListItem[];
}

interface FilterOption {
  label: string;
  value: MatchStatusFilter;
}

@Component({
  selector: 'app-match-list-page',
  standalone: true,
  imports: [MatchCard],
  templateUrl: './match-list-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchListPage {
  private readonly matchService = inject(MatchService);

  protected readonly loading = signal(true);
  protected readonly matches = signal<MatchListItem[]>([]);
  protected readonly statusFilter = signal<MatchStatusFilter>('all');

  protected readonly filters: FilterOption[] = [
    { label: 'Tous', value: 'all' },
    { label: 'À pronostiquer', value: 'scheduled' },
    { label: 'Pronos clos', value: 'locked' },
    { label: 'Matchs joués', value: 'finished' },
  ];

  protected readonly filteredMatches = computed(() => {
    const list = this.matches();
    const filter = this.statusFilter();
    if (filter === 'all') {
      return list;
    }
    return list.filter((m) => m.status === filter);
  });

  protected readonly dateGroups = computed<MatchDateGroup[]>(() => {
    const sorted = [...this.filteredMatches()].sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
    );
    const map = new Map<string, MatchListItem[]>();
    for (const m of sorted) {
      const key = m.kickoff.slice(0, 10);
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(m);
      } else {
        map.set(key, [m]);
      }
    }
    return [...map.entries()].map(([dateKey, matches]) => ({
      dateKey,
      labelDate: `${dateKey}T12:00:00.000Z`,
      matches,
    }));
  });

  constructor() {
    this.matchService
      .getMatches()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rows) => {
          this.matches.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.matches.set([]);
          this.loading.set(false);
        },
      });
  }

  protected setFilter(value: MatchStatusFilter): void {
    this.statusFilter.set(value);
  }

  protected isFilterActive(value: MatchStatusFilter): boolean {
    return this.statusFilter() === value;
  }
}
