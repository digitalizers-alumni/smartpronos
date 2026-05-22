import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatchCard } from '../../components/match-card/match-card';
import { UserRankCard } from '../../shared/components/user-rank-card/user-rank-card';
import { MatchListItem, MatchStatus } from '../../shared/models/match.models';
import { MatchService } from '../../services/match.service';
import { extractRoundKey, stageLabel } from '../../shared/utils/stage-label';

export type MatchStatusFilter = 'all' | 'mine' | MatchStatus;

export interface MatchDateGroup {
  dateKey: string;
  labelDate: string;
  matches: MatchListItem[];
}

interface StatusFilterOption {
  label: string;
  value: MatchStatusFilter;
}

interface RoundFilterOption {
  label: string;
  value: string;
}

interface GroupFilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-match-list-page',
  standalone: true,
  imports: [MatchCard, UserRankCard],
  templateUrl: './match-list-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchListPage {
  private readonly matchService = inject(MatchService);

  protected readonly loading = signal(true);
  protected readonly matches = signal<MatchListItem[]>([]);
  protected readonly statusFilter = signal<MatchStatusFilter>('all');

  protected readonly userPoints = signal(1_240);
  protected readonly userRank = signal(4);

  protected readonly statusFilters: StatusFilterOption[] = [
    { label: 'Tous', value: 'all' },
    { label: 'Mes pronos', value: 'mine' },
    { label: 'À pronostiquer', value: 'scheduled' },
    { label: 'Pronos clos', value: 'locked' },
    { label: 'Matchs joués', value: 'finished' },
  ];

  protected readonly advancedOpen = signal(false);

  protected readonly selectedRounds = signal<Set<string>>(new Set());
  protected readonly selectedGroups = signal<Set<string>>(new Set());

  protected readonly roundOptions = computed<RoundFilterOption[]>(() => {
    const seen = new Set<string>();
    const options: RoundFilterOption[] = [];
    for (const m of this.matches()) {
      const key = extractRoundKey(m.stage);
      if (!seen.has(key)) {
        seen.add(key);
        options.push({ label: stageLabel(key), value: key });
      }
    }
    return options.sort((a, b) => a.value.localeCompare(b.value));
  });

  protected readonly groupOptions = computed<GroupFilterOption[]>(() => {
    const seen = new Set<string>();
    const options: GroupFilterOption[] = [];
    for (const m of this.matches()) {
      const g = m.group;
      if (g && !seen.has(g)) {
        seen.add(g);
        options.push({ label: `Groupe ${g}`, value: g });
      }
    }
    return options.sort((a, b) => a.value.localeCompare(b.value));
  });

  protected readonly filteredMatches = computed(() => {
    let list = this.matches();

    const status = this.statusFilter();
    if (status === 'mine') {
      list = list.filter((m) => m.prediction.hasPrediction);
    } else if (status !== 'all') {
      list = list.filter((m) => m.status === status);
    }

    const rounds = this.selectedRounds();
    if (rounds.size > 0) {
      list = list.filter((m) => rounds.has(extractRoundKey(m.stage)));
    }

    const groups = this.selectedGroups();
    if (groups.size > 0) {
      list = list.filter((m) => m.group && groups.has(m.group));
    }

    return list;
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
    const saved = localStorage.getItem('tribbo_filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.rounds) this.selectedRounds.set(new Set(parsed.rounds));
        if (parsed.groups) this.selectedGroups.set(new Set(parsed.groups));
      } catch { /* ignore */ }
    }

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

  protected toggleAdvanced(): void {
    this.advancedOpen.update((v) => !v);
  }

  protected hasActiveAdvancedFilters(): boolean {
    return this.selectedRounds().size > 0 || this.selectedGroups().size > 0;
  }

  protected toggleRound(round: string): void {
    this.selectedRounds.update((set) => {
      const next = new Set(set);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
    this.saveFilters();
  }

  protected toggleGroup(group: string): void {
    this.selectedGroups.update((set) => {
      const next = new Set(set);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
    this.saveFilters();
  }

  protected clearAdvancedFilters(): void {
    this.selectedRounds.set(new Set());
    this.selectedGroups.set(new Set());
    this.saveFilters();
  }

  private saveFilters(): void {
    localStorage.setItem('tribbo_filters', JSON.stringify({
      rounds: [...this.selectedRounds()],
      groups: [...this.selectedGroups()],
    }));
  }

  protected setFilter(value: MatchStatusFilter): void {
    this.statusFilter.set(value);
  }

  protected isFilterActive(value: MatchStatusFilter): boolean {
    return this.statusFilter() === value;
  }
}
