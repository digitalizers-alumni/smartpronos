import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import {
  CurrentUserTribe,
  LeaderboardService,
  LeaderboardUserRow,
  TribesLeaderboardRow,
} from '../../services/leaderboard.service';

interface LeaderboardPlayer {
  id: string;
  rank: number;
  name: string;
  initials: string;
  subtitle: string;
  points: number;
  exactCount: number;
  isYou: boolean;
}

interface TribeRow {
  id: string;
  rank: number;
  name: string;
  code: string;
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

  protected readonly activeTab = signal<'global' | 'tribu' | 'tribes'>('global');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly currentTribe = signal<CurrentUserTribe>({
    tribe_id: null,
    tribe_name: null,
  });
  protected readonly globalLb = signal<LeaderboardPlayer[]>([]);
  protected readonly tribeMembers = signal<LeaderboardPlayer[]>([]);
  protected readonly tribes = signal<TribeRow[]>([]);

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

  private loadLeaderboards(): void {
    this.loading.set(true);
    this.error.set(null);

    this.leaderboardService
      .getCurrentUserTribe()
      .pipe(
        switchMap((tribe) => {
          this.currentTribe.set(tribe);
          return forkJoin({
            global: this.leaderboardService.getGlobalLeaderboard(),
            tribeMembers: tribe.tribe_id
              ? this.leaderboardService.getMyTribeLeaderboard()
              : of([] as LeaderboardUserRow[]),
            tribes: this.leaderboardService.getTribesLeaderboard(),
          });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ global, tribeMembers, tribes }) => {
          this.globalLb.set(global.map((row) => this.toPlayer(row)));
          this.tribeMembers.set(tribeMembers.map((row) => this.toPlayer(row, this.currentTribe().tribe_name)));
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

  private toPlayer(row: LeaderboardUserRow, tribeName?: string | null): LeaderboardPlayer {
    const name = row.username ?? 'Joueur';
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
    };
  }

  private toTribe(row: TribesLeaderboardRow): TribeRow {
    return {
      id: row.tribe_id,
      rank: Number(row.rank),
      name: row.name,
      code: tribeCode(row.name),
      members: Number(row.member_count),
      activeMembers: Number(row.active_member_count),
      avgPoints: Math.round(Number(row.avg_points)),
      totalPoints: Number(row.total_points),
      isMine: row.tribe_id === this.currentTribe().tribe_id,
    };
  }
}
