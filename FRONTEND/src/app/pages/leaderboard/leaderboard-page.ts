import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import {
  CurrentUserTribe,
  LeaderboardService,
  LeaderboardUserRow,
  TribesLeaderboardRow,
  UserTribe,
} from '../../services/leaderboard.service';
import { AvatarService } from '../../services/avatar.service';

interface LeaderboardPlayer {
  id: string;
  rank: number;
  name: string;
  initials: string;
  subtitle: string;
  points: number;
  exactCount: number;
  isYou: boolean;
  avatarUrl: string | null;
}

interface TribeRow {
  id: string;
  rank: number;
  name: string;
  code: string;
  countryFlagUrl: string | null;
  avatarUrl: string | null;
  members: number;
  activeMembers: number;
  avgPoints: number;
  totalPoints: number;
  isMine: boolean;
}

const AVATAR_COLORS = ['#1D4DFF', '#19C95B', '#FF3B43', '#6B8AFF', '#9B5DE5', '#F15BB5', '#00BBF9', '#E6A700'];

function avatarColor(name: string): string {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function tribeCode(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .padEnd(2, name[0]?.toUpperCase() ?? 'T');
}

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  templateUrl: './leaderboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardPage {
  private readonly authService = inject(AuthService);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly avatarService = inject(AvatarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<'global' | 'tribu' | 'tribes'>('global');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly currentTribe = signal<CurrentUserTribe>({
    tribe_id: null,
    tribe_name: null,
    avatar_path: null,
  });
  protected readonly userTribes = signal<UserTribe[]>([]);
  protected readonly selectedTribeId = signal<string | null>(null);
  protected readonly globalLb = signal<LeaderboardPlayer[]>([]);
  protected readonly tribeMembers = signal<LeaderboardPlayer[]>([]);
  protected readonly tribes = signal<TribeRow[]>([]);

  protected readonly realTribes = computed(() =>
    this.tribes().filter((t) => t.activeMembers >= 5)
  );

  protected readonly smallTribes = computed(() =>
    this.tribes().filter((t) => t.activeMembers === 3 || t.activeMembers === 4)
  );

  protected readonly outOfRankingTribes = computed(() =>
    this.tribes().filter((t) => t.activeMembers <= 2)
  );

  protected readonly tabs = [
    { key: 'global' as const, label: 'Global' },
    { key: 'tribu' as const, label: 'Ma Tribu' },
    { key: 'tribes' as const, label: 'Tribus' },
  ];

  protected readonly me = computed(() => this.globalLb().find((p) => p.isYou) ?? null);
  protected readonly meInTribe = computed(() => this.tribeMembers().find((p) => p.isYou) ?? null);

  protected readonly userRank = computed(() => this.me()?.rank ?? null);
  protected readonly userTotalPlayers = computed(() => this.globalLb().length);

  protected avatarColor = avatarColor;

  constructor() {
    this.loadLeaderboards();
  }

  protected setTab(key: 'global' | 'tribu' | 'tribes'): void {
    this.activeTab.set(key);
  }

  protected selectTribe(tribe: UserTribe): void {
    if (this.selectedTribeId() === tribe.tribe_id) return;
    this.selectedTribeId.set(tribe.tribe_id);
    this.currentTribe.set({
      tribe_id: tribe.tribe_id,
      tribe_name: tribe.tribe_name,
      is_country_tribe: tribe.is_country_tribe,
      country_flag_url: tribe.country_flag_url,
      avatar_path: tribe.avatar_path,
    });
    this.loadSelectedTribeLeaderboard();
  }

  protected openMyTribe(tribe: TribeRow): void {
    if (tribe.isMine) {
      this.router.navigate(['/tribe'], {
        queryParams: { tribeId: tribe.id },
      });
      return;
    }
    this.router.navigate(['/tribes', tribe.id]);
  }

  protected openPlayer(player: LeaderboardPlayer): void {
    if (player.isYou) {
      this.router.navigateByUrl('/profile');
      return;
    }
    this.router.navigate(['/players', player.id]);
  }

  private loadLeaderboards(): void {
    this.loading.set(true);
    this.error.set(null);

    this.leaderboardService
      .getCurrentUserTribes()
      .pipe(
        switchMap((userTribes) => {
          this.userTribes.set(userTribes);
          const selectedTribe = this.defaultSelectedTribe(userTribes);
          this.selectedTribeId.set(selectedTribe?.tribe_id ?? null);
          this.currentTribe.set({
            tribe_id: selectedTribe?.tribe_id ?? null,
            tribe_name: selectedTribe?.tribe_name ?? null,
            is_country_tribe: selectedTribe?.is_country_tribe ?? null,
            country_flag_url: selectedTribe?.country_flag_url ?? null,
            avatar_path: selectedTribe?.avatar_path ?? null,
          });
          return forkJoin({
            global: this.leaderboardService.getGlobalLeaderboard(),
            tribeMembers: selectedTribe?.tribe_id
              ? this.leaderboardService.getTribeLeaderboard(selectedTribe.tribe_id)
              : of([] as LeaderboardUserRow[]),
            tribes: this.leaderboardService.getTribesLeaderboard(),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ global, tribeMembers, tribes }) => {
          const rankedGlobal = assignDenseRanks(global, (a, b) =>
            Number(a.total_points) === Number(b.total_points) &&
            Number(a.exact_count) === Number(b.exact_count)
          );
          const rankedTribe = assignDenseRanks(tribeMembers, (a, b) =>
            Number(a.total_points) === Number(b.total_points) &&
            Number(a.exact_count) === Number(b.exact_count)
          );
          this.globalLb.set(rankedGlobal.map((row) => this.toPlayer(row)));
          this.tribeMembers.set(rankedTribe.map((row) => this.toPlayer(row, this.currentTribe().tribe_name)));
          this.tribes.set(tribes.map((row) => this.toTribe(row)));
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[LeaderboardPage] Impossible de charger les classements.', err);
          this.error.set(
            'Impossible de charger les classements depuis la base locale. Vérifie que les RPC leaderboard existent et que Supabase est démarré.',
          );
          this.loading.set(false);
        },
      });
  }

  private loadSelectedTribeLeaderboard(): void {
    const tribeId = this.selectedTribeId();
    const tribeName = this.currentTribe().tribe_name;
    if (!tribeId) {
      this.tribeMembers.set([]);
      return;
    }

    this.leaderboardService
      .getTribeLeaderboard(tribeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => {
          const rankedMembers = assignDenseRanks(members, (a, b) =>
            Number(a.total_points) === Number(b.total_points) &&
            Number(a.exact_count) === Number(b.exact_count)
          );
          this.tribeMembers.set(rankedMembers.map((row) => this.toPlayer(row, tribeName)));
        },
        error: (err) => {
          console.error('[LeaderboardPage] Impossible de charger le classement de la tribu.', err);
          this.error.set('Impossible de charger le classement de cette tribu depuis la base locale.');
        },
      });
  }

  private defaultSelectedTribe(userTribes: UserTribe[]): UserTribe | null {
    return userTribes.find((tribe) => tribe.is_country_tribe) ?? userTribes[0] ?? null;
  }

  private toPlayer(row: LeaderboardUserRow, tribeName?: string | null): LeaderboardPlayer {
    const name = row.username ?? `user_${row.user_id.slice(0, 8)}`;
    const exactCount = Number(row.exact_count);
    return {
      id: row.user_id,
      rank: Number(row.rank),
      name,
      initials: initials(name),
      subtitle: tribeName ?? `${exactCount} score${exactCount > 1 ? 's' : ''} exact${exactCount > 1 ? 's' : ''}`,
      points: Number(row.total_points),
      exactCount,
      isYou: row.user_id === this.authService.currentUser()?.id,
      avatarUrl: this.avatarService.getPublicUrl(row.avatar_path),
    };
  }

  private toTribe(row: TribesLeaderboardRow): TribeRow {
    return {
      id: row.tribe_id,
      rank: Number(row.rank),
      name: row.name,
      code: tribeCode(row.name),
      countryFlagUrl: row.is_country_tribe ? row.country_flag_url : null,
      avatarUrl: row.is_country_tribe ? null : this.avatarService.getPublicUrl(row.avatar_path),
      members: Number(row.member_count),
      activeMembers: Number(row.active_member_count),
      avgPoints: Math.round(Number(row.avg_points)),
      totalPoints: Number(row.total_points),
      isMine: this.userTribes().some((tribe) => tribe.tribe_id === row.tribe_id),
    };
  }
}

function assignDenseRanks<T extends { rank: number | string }>(
  items: T[],
  isEqual: (a: T, b: T) => boolean
): T[] {
  let currentRank = 1;
  return items.map((item, index) => {
    if (index > 0) {
      const prev = items[index - 1];
      if (!isEqual(prev, item)) {
        currentRank++;
      }
    }
    return { ...item, rank: currentRank };
  });
}
