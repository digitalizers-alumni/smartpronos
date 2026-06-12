import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { MatchCard } from '../../components/match-card/match-card';
import { UserRankCard } from '../../shared/components/user-rank-card/user-rank-card';
import { MatchListItem, MatchStatus } from '../../shared/models/match.models';
import { MatchService } from '../../services/match.service';
import { TeamService } from '../../services/team.service';
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
  private readonly teamService = inject(TeamService);

  protected readonly loading = signal(true);
  protected readonly matches = signal<MatchListItem[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly statusFilter = signal<MatchStatusFilter>('all');

  protected readonly userPoints = signal<number | null>(null);
  protected readonly userRank = signal<number | null>(null);
  protected readonly profileError = signal<string | null>(null);

  protected readonly statusFilters: StatusFilterOption[] = [
    { label: 'Tous', value: 'all' },
    { label: 'Mes pronos', value: 'mine' },
    { label: 'À pronostiquer', value: 'scheduled' },
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

  protected readonly showRoundFilters = computed(() => this.roundOptions().length > 1);
  protected readonly showGroupFilters = computed(() => this.groupOptions().length > 1);

  protected readonly filteredMatches = computed(() => {
    let list = this.matches();

    const status = this.statusFilter();
    if (status === 'mine') {
      list = list.filter((m) => m.prediction.hasPrediction);
    } else if (status === 'scheduled') {
      list = list.filter((m) => m.status === 'scheduled' && !m.prediction.hasPrediction);
    } else if (status !== 'all') {
      list = list.filter((m) => m.status === status);
    }

    const rounds = this.showRoundFilters() ? this.selectedRounds() : new Set<string>();
    if (rounds.size > 0) {
      list = list.filter((m) => rounds.has(extractRoundKey(m.stage)));
    }

    const groups = this.showGroupFilters() ? this.selectedGroups() : new Set<string>();
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

    this.teamService.getUserProfile().subscribe({
      next: (p) => {
        this.userPoints.set(p.total_points);
        this.userRank.set(p.rank ?? 0);
        this.profileError.set(null);
      },
      error: (err) => {
        console.error('[MatchListPage] Impossible de charger le profil utilisateur.', err);
        this.userPoints.set(null);
        this.userRank.set(null);
        this.profileError.set('Points indisponibles pour le moment.');
      },
    });

    interval(30_000).pipe(
      startWith(0),
      switchMap(() => this.matchService.getMatches()),
      takeUntilDestroyed(),
    ).subscribe({
      next: (rows) => {
        this.matches.set(rows);
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[MatchListPage] Impossible de charger les matchs depuis Supabase.', err);
        this.matches.set([]);
        this.error.set(
          'Impossible de charger les matchs depuis la base locale. Vérifie que Supabase est démarré, que le frontend pointe vers l’URL locale et que la RPC get_match_list existe.',
        );
        this.loading.set(false);
      },
    });
  }

  protected toggleAdvanced(): void {
    this.advancedOpen.update((v) => !v);
  }

  protected hasActiveAdvancedFilters(): boolean {
    return (
      (this.showRoundFilters() && this.selectedRounds().size > 0) ||
      (this.showGroupFilters() && this.selectedGroups().size > 0)
    );
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
