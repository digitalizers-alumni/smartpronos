import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  TribeDashboard,
  TribeMemberWithScore,
  TribeService,
  TribesLeaderboardRow,
  UserTribe,
} from '../../services/tribe.service';

interface TribeMember {
  id: string;
  rank: number;
  name: string;
  initials: string;
  points: number;
  exactCount: number;
  isYou: boolean;
  noPred: boolean;
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
  selector: 'app-tribe-page',
  standalone: true,
  imports: [],
  templateUrl: './tribe-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TribePage {
  private readonly authService = inject(AuthService);
  private readonly tribeService = inject(TribeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly actionLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionSuccess = signal<string | null>(null);
  protected readonly dashboard = signal<TribeDashboard | null>(null);
  protected readonly createName = signal('');
  protected readonly joinCode = signal('');
  protected readonly showTribeActions = signal(false);
  protected readonly selectedTribeId = signal<string | null>(null);
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;

  protected readonly hasTribe = computed(() => this.dashboard()?.profile.tribe_id != null);
  protected readonly userTribes = computed(() => this.dashboard()?.userTribes ?? []);
  protected readonly selectedTribeIndex = computed(() => {
    const tribeId = this.dashboard()?.profile.tribe_id;
    if (!tribeId) return -1;
    return this.userTribes().findIndex((tribe) => tribe.tribe_id === tribeId);
  });
  protected readonly canNavigateTribes = computed(() => this.userTribes().length > 1);
  protected readonly tribePositionLabel = computed(() => {
    const index = this.selectedTribeIndex();
    const total = this.userTribes().length;
    if (index < 0 || total <= 1) return '';
    return `${index + 1} / ${total}`;
  });
  protected readonly tribeName = computed(() => this.dashboard()?.profile.tribe_name ?? '');
  protected readonly tribeCode = computed(() => tribeCode(this.tribeName()));
  protected readonly members = computed(() => this.toMembers(this.dashboard()?.members ?? []));
  protected readonly memberCount = computed(() => Number(this.dashboard()?.invite?.member_count ?? this.dashboard()?.score?.member_count ?? 0));
  protected readonly activeMemberCount = computed(() => Number(this.dashboard()?.score?.active_member_count ?? 0));
  protected readonly avgPoints = computed(() => Math.round(Number(this.dashboard()?.score?.avg_points ?? 0)));
  protected readonly inviteCode = computed(() => this.dashboard()?.invite?.invite_code ?? '');
  protected readonly isCountryTribe = computed(() =>
    this.dashboard()?.profile.is_country_tribe === true ||
    this.dashboard()?.invite?.is_country_tribe === true
  );
  protected readonly tribeRank = computed(() => this.currentTribeRank()?.rank ?? null);
  protected readonly totalTribes = computed(() => this.dashboard()?.tribesLeaderboard.length ?? 0);
  protected readonly rival = computed(() => {
    const current = this.currentTribeRank();
    const board = this.dashboard()?.tribesLeaderboard ?? [];
    if (!current || Number(current.rank) <= 1) return null;
    return board.find((row) => Number(row.rank) === Number(current.rank) - 1) ?? null;
  });
  protected readonly rivalGap = computed(() => {
    const current = this.currentTribeRank();
    const rival = this.rival();
    if (!current || !rival) return 0;
    return Math.max(0, Math.round(Number(rival.avg_points) - Number(current.avg_points)));
  });

  protected avatarColor = avatarColor;

  constructor() {
    this.loadDashboard();
  }

  protected createTribe(): void {
    const name = this.createName().trim();
    if (!name) {
      this.actionError.set('Entre un nom de tribu.');
      return;
    }

    this.runAction(this.tribeService.createTribe(name), 'Tribu créée.');
  }

  protected joinTribe(): void {
    const code = this.joinCode().trim();
    if (!code) {
      this.actionError.set('Entre un code d’invitation.');
      return;
    }

    this.runAction(this.tribeService.joinTribe(code), 'Tribu rejointe.');
  }

  protected leaveTribe(): void {
    if (this.isCountryTribe()) {
      this.actionError.set('Tu ne peux pas quitter la tribu de ton pays.');
      return;
    }
    const tribeId = this.dashboard()?.profile.tribe_id;
    if (!tribeId) return;
    this.runAction(this.tribeService.leaveTribe(tribeId), 'Tu as quitté la tribu.');
  }

  protected toggleTribeActions(): void {
    this.showTribeActions.update((visible) => !visible);
    this.actionError.set(null);
    this.actionSuccess.set(null);
  }

  protected previousTribe(): void {
    this.selectTribeByOffset(-1);
  }

  protected nextTribe(): void {
    this.selectTribeByOffset(1);
  }

  protected startSwipe(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this.touchStartX = touch?.clientX ?? null;
    this.touchStartY = touch?.clientY ?? null;
  }

  protected endSwipe(event: TouchEvent): void {
    if (this.touchStartX === null || this.touchStartY === null || !this.canNavigateTribes()) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? this.touchStartX;
    const touchEndY = event.changedTouches[0]?.clientY ?? this.touchStartY;
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    this.touchStartX = null;
    this.touchStartY = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX > 0) {
      this.previousTribe();
    } else {
      this.nextTribe();
    }
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tribeService
      .getDashboard(this.selectedTribeId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.selectedTribeId.set(dashboard.profile.tribe_id);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[TribePage] Impossible de charger la tribu.', err);
          this.error.set('Impossible de charger ta tribu depuis la base locale.');
          this.loading.set(false);
        },
      });
  }

  private runAction(action$: Observable<void>, successMessage: string): void {
    this.actionLoading.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    action$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.actionSuccess.set(successMessage);
        this.createName.set('');
        this.joinCode.set('');
        this.showTribeActions.set(false);
        this.actionLoading.set(false);
        this.selectedTribeId.set(null);
        this.loadDashboard();
      },
      error: (err) => {
        console.error('[TribePage] Action tribu impossible.', err);
        this.actionError.set(err instanceof Error ? err.message : 'Action impossible.');
        this.actionLoading.set(false);
      },
    });
  }

  private toMembers(rows: TribeMemberWithScore[]): TribeMember[] {
    return rows.map((row, index) => {
      const name = row.username ?? `user_${row.user_id.slice(0, 8)}`;
      const points = Number(row.total_points);
      return {
        id: row.user_id,
        rank: index + 1,
        name,
        initials: initials(name),
        points,
        exactCount: Number(row.exact_count),
        isYou: row.user_id === this.authService.currentUser()?.id,
        noPred: points === 0,
      };
    });
  }

  private currentTribeRank(): TribesLeaderboardRow | null {
    const tribeId = this.dashboard()?.profile.tribe_id;
    if (!tribeId) return null;
    return this.dashboard()?.tribesLeaderboard.find((row) => row.tribe_id === tribeId) ?? null;
  }

  private selectTribeByOffset(offset: number): void {
    const tribes = this.userTribes();
    const currentIndex = this.selectedTribeIndex();
    if (tribes.length <= 1 || currentIndex < 0) return;

    const nextIndex = (currentIndex + offset + tribes.length) % tribes.length;
    const nextTribe = tribes[nextIndex] as UserTribe;
    this.selectedTribeId.set(nextTribe.tribe_id);
    this.loadDashboard();
  }
}
