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
  countryFlagUrl: string | null;
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly activeTab = signal<'global' | 'tribu' | 'tribes'>('global');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly currentTribe = signal<CurrentUserTribe>({
    tribe_id: null,
    tribe_name: null,
  });
  protected readonly userTribes = signal<UserTribe[]>([]);
  protected readonly selectedTribeId = signal<string | null>(null);
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

  protected selectTribe(tribe: UserTribe): void {
    if (this.selectedTribeId() === tribe.tribe_id) return;
    this.selectedTribeId.set(tribe.tribe_id);
    this.currentTribe.set({
      tribe_id: tribe.tribe_id,
      tribe_name: tribe.tribe_name,
      is_country_tribe: tribe.is_country_tribe,
    });
    this.loadSelectedTribeLeaderboard();
  }

  protected openMyTribe(tribe: TribeRow): void {
    if (!tribe.isMine) return;
    this.router.navigate(['/tribe'], {
      queryParams: { tribeId: tribe.id },
    });
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
          this.tribeMembers.set(members.map((row) => this.toPlayer(row, tribeName)));
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
    };
  }

  private toTribe(row: TribesLeaderboardRow): TribeRow {
    return {
      id: row.tribe_id,
      rank: Number(row.rank),
      name: row.name,
      code: tribeCode(row.name),
      countryFlagUrl: row.is_country_tribe ? row.country_flag_url : null,
      members: Number(row.member_count),
      activeMembers: Number(row.active_member_count),
      avgPoints: Math.round(Number(row.avg_points)),
      totalPoints: Number(row.total_points),
      isMine: this.userTribes().some((tribe) => tribe.tribe_id === row.tribe_id),
    };
  }
}
