import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../services/avatar.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { PublicProfileService, PublicTribe, PublicTribeMember } from '../../services/public-profile.service';

interface PublicTribeMemberView {
  id: string;
  rank: number;
  name: string;
  initials: string;
  points: number;
  exactCount: number;
  isYou: boolean;
  avatarUrl: string | null;
}

const AVATAR_COLORS = ['#1D4DFF', '#19C95B', '#FF3B43', '#6B8AFF', '#9B5DE5', '#F15BB5', '#00BBF9', '#E6A700'];

function avatarColor(name: string): string {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name || 'T').slice(0, 2).toUpperCase();
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
  selector: 'app-public-tribe-page',
  standalone: true,
  templateUrl: './public-tribe-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicTribePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly avatarService = inject(AvatarService);
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly publicProfileService = inject(PublicProfileService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tribe = signal<PublicTribe | null>(null);
  protected readonly myTribeIds = signal<Set<string>>(new Set());

  protected readonly tribeName = computed(() => this.tribe()?.name ?? 'Tribu');
  protected readonly tribeCode = computed(() => tribeCode(this.tribeName()));
  protected readonly tribeAvatarUrl = computed(() => {
    const tribe = this.tribe();
    if (!tribe) return null;
    if (tribe.is_country_tribe) return tribe.country_flag_url;
    return this.avatarService.getPublicUrl(tribe.avatar_path);
  });
  protected readonly members = computed(() => this.toMembers(this.tribe()?.members ?? []));
  protected readonly memberCount = computed(() => Number(this.tribe()?.member_count ?? 0));
  protected readonly activeMemberCount = computed(() => Number(this.tribe()?.active_member_count ?? 0));
  protected readonly avgPoints = computed(() => Math.round(Number(this.tribe()?.avg_points ?? 0)));
  protected readonly totalPoints = computed(() => Number(this.tribe()?.total_points ?? 0));

  protected avatarColor = avatarColor;

  constructor() {
    this.leaderboardService
      .getCurrentUserTribes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tribes) => this.myTribeIds.set(new Set(tribes.map((tribe) => tribe.tribe_id))),
        error: (err) => console.error('[PublicTribePage] Impossible de charger les tribus utilisateur.', err),
      });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tribeId = params.get('tribeId');
      if (!tribeId) {
        this.error.set('Tribu introuvable.');
        this.loading.set(false);
        return;
      }
      if (this.myTribeIds().has(tribeId)) {
        this.router.navigate(['/tribe'], { queryParams: { tribeId } });
        return;
      }
      this.loadTribe(tribeId);
    });
  }

  protected openPlayer(member: PublicTribeMemberView): void {
    if (member.isYou) {
      this.router.navigateByUrl('/profile');
      return;
    }
    this.router.navigate(['/players', member.id]);
  }

  private loadTribe(tribeId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.publicProfileService
      .getTribe(tribeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tribe) => {
          if (!tribe) {
            this.error.set('Tribu introuvable.');
            this.tribe.set(null);
          } else {
            this.tribe.set(tribe);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[PublicTribePage] Impossible de charger la tribu publique.', err);
          this.error.set('Impossible de charger cette tribu.');
          this.tribe.set(null);
          this.loading.set(false);
        },
      });
  }

  private toMembers(rows: PublicTribeMember[]): PublicTribeMemberView[] {
    return rows.map((row) => {
      const name = row.username ?? `user_${row.user_id.slice(0, 8)}`;
      return {
        id: row.user_id,
        rank: Number(row.rank),
        name,
        initials: initials(name),
        points: Number(row.total_points),
        exactCount: Number(row.exact_count),
        isYou: row.user_id === this.authService.currentUser()?.id,
        avatarUrl: this.avatarService.getPublicUrl(row.avatar_path),
      };
    });
  }
}
