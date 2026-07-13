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

export type MatchStatusFilter = 'all' | 'upcoming' | 'mine' | MatchStatus;

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
  protected readonly statusFilter = signal<MatchStatusFilter>('upcoming');

  protected readonly userPoints = signal<number | null>(null);
  protected readonly userRank = signal<number | null>(null);
  protected readonly profileError = signal<string | null>(null);
  protected readonly showBonusBanner = signal(!localStorage.getItem('tribbo_bonus_boosts_dismissed'));

  protected readonly statusFilters: StatusFilterOption[] = [
    { label: 'Tous', value: 'all' },
    { label: 'À pronostiquer', value: 'scheduled' },
    { label: 'Mes pronos', value: 'mine' },
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
        options.push({ label: getStageAbbreviation(key), value: key });
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
        options.push({ label: g, value: g });
      }
    }
    return options.sort((a, b) => a.value.localeCompare(b.value));
  });

  protected readonly showRoundFilters = computed(() => this.roundOptions().length > 1);
  protected readonly showGroupFilters = computed(() => this.groupOptions().length > 1);

  protected readonly filteredMatches = computed(() => {
    let list = this.matches();

    const rounds = this.showRoundFilters() ? this.selectedRounds() : new Set<string>();
    const groups = this.showGroupFilters() ? this.selectedGroups() : new Set<string>();
    const hasAdvancedFilter = rounds.size > 0 || groups.size > 0;

    let status = this.statusFilter();
    // Si un filtre avancé (tour ou groupe) est actif et que le statut est "à venir" (par défaut),
    // on bascule implicitement sur "tous" les matchs pour afficher l'historique complet de ce filtre.
    if (status === 'upcoming' && hasAdvancedFilter) {
      status = 'all';
    }

    if (status === 'upcoming') {
      list = list.filter((m) => m.status === 'scheduled' || m.status === 'locked');
    } else if (status === 'mine') {
      list = list.filter((m) => m.prediction.hasPrediction);
    } else if (status === 'scheduled') {
      list = list.filter((m) => m.status === 'scheduled' && !m.prediction.hasPrediction);
    } else if (status === 'finished') {
      list = list.filter((m) => m.status === 'finished');
    } // Si 'all', on ne filtre pas par statut

    if (rounds.size > 0) {
      list = list.filter((m) => rounds.has(extractRoundKey(m.stage)));
    }

    if (groups.size > 0) {
      list = list.filter((m) => m.group && groups.has(m.group));
    }

    return list;
  });

  protected readonly dateGroups = computed<MatchDateGroup[]>(() => {
    const isFinished = this.statusFilter() === 'finished';
    const sorted = [...this.filteredMatches()].sort((a, b) => {
      const timeA = new Date(a.kickoff).getTime();
      const timeB = new Date(b.kickoff).getTime();
      return isFinished ? timeB - timeA : timeA - timeB;
    });
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
        if (parsed.status) this.statusFilter.set(parsed.status);
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

  protected hasActiveFilters(): boolean {
    return (
      (this.showRoundFilters() && this.selectedRounds().size > 0) ||
      (this.showGroupFilters() && this.selectedGroups().size > 0) ||
      this.statusFilter() !== 'upcoming'
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
    this.statusFilter.set('upcoming');
    this.saveFilters();
  }

  private saveFilters(): void {
    localStorage.setItem('tribbo_filters', JSON.stringify({
      rounds: [...this.selectedRounds()],
      groups: [...this.selectedGroups()],
      status: this.statusFilter(),
    }));
  }

  protected toggleStatusFilter(value: MatchStatusFilter): void {
    if (this.statusFilter() === value) {
      this.statusFilter.set('upcoming');
    } else {
      this.statusFilter.set(value);
    }
    this.saveFilters();
  }

  protected isFilterActive(value: MatchStatusFilter): boolean {
    return this.statusFilter() === value;
  }

  protected dismissBonusBanner(): void {
    localStorage.setItem('tribbo_bonus_boosts_dismissed', 'true');
    this.showBonusBanner.set(false);
  }
}

function getStageAbbreviation(key: string): string {
  switch (key) {
    case 'group':
      return 'Groupes';
    case 'round_of_32':
      return '1/16';
    case 'round_of_16':
      return '1/8';
    case 'quarter_final':
      return '1/4';
    case 'semi_final':
      return '1/2';
    case 'third_place':
      return '3ᵉ';
    case 'final':
      return 'F';
    default:
      return key;
  }
}

