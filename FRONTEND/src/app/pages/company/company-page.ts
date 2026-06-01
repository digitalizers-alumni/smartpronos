import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  CompaniesLeaderboardRow,
  CompanyDashboard,
  CompanyMemberWithScore,
  CompanyService,
} from '../../services/company.service';

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
  selector: 'app-company-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './company-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyPage {
  private readonly authService = inject(AuthService);
  private readonly companyService = inject(CompanyService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly actionLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionSuccess = signal<string | null>(null);
  protected readonly dashboard = signal<CompanyDashboard | null>(null);
  protected readonly createName = signal('');
  protected readonly joinCode = signal('');

  protected readonly hasTribe = computed(() => this.dashboard()?.profile.company_id != null);
  protected readonly tribeName = computed(() => this.dashboard()?.profile.company_name ?? '');
  protected readonly tribeCode = computed(() => tribeCode(this.tribeName()));
  protected readonly members = computed(() => this.toMembers(this.dashboard()?.members ?? []));
  protected readonly memberCount = computed(() => Number(this.dashboard()?.invite?.member_count ?? this.dashboard()?.score?.member_count ?? 0));
  protected readonly activeMemberCount = computed(() => Number(this.dashboard()?.score?.active_member_count ?? 0));
  protected readonly avgPoints = computed(() => Math.round(Number(this.dashboard()?.score?.avg_points ?? 0)));
  protected readonly inviteCode = computed(() => this.dashboard()?.invite?.invite_code ?? '');
  protected readonly tribeRank = computed(() => this.currentCompanyRank()?.rank ?? null);
  protected readonly totalTribes = computed(() => this.dashboard()?.companiesLeaderboard.length ?? 0);
  protected readonly rival = computed(() => {
    const current = this.currentCompanyRank();
    const board = this.dashboard()?.companiesLeaderboard ?? [];
    if (!current || Number(current.rank) <= 1) return null;
    return board.find((row) => Number(row.rank) === Number(current.rank) - 1) ?? null;
  });
  protected readonly rivalGap = computed(() => {
    const current = this.currentCompanyRank();
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

    this.runAction(this.companyService.createCompany(name), 'Tribu créée.');
  }

  protected joinTribe(): void {
    const code = this.joinCode().trim();
    if (!code) {
      this.actionError.set('Entre un code d’invitation.');
      return;
    }

    this.runAction(this.companyService.joinCompany(code), 'Tribu rejointe.');
  }

  protected leaveTribe(): void {
    const companyId = this.dashboard()?.profile.company_id;
    if (!companyId) return;
    this.runAction(this.companyService.leaveCompany(companyId), 'Tu as quitté la tribu.');
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.companyService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[CompanyPage] Impossible de charger la tribu.', err);
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
        this.actionLoading.set(false);
        this.loadDashboard();
      },
      error: (err) => {
        console.error('[CompanyPage] Action tribu impossible.', err);
        this.actionError.set(err instanceof Error ? err.message : 'Action impossible.');
        this.actionLoading.set(false);
      },
    });
  }

  private toMembers(rows: CompanyMemberWithScore[]): TribeMember[] {
    return rows.map((row, index) => {
      const name = row.username ?? 'Joueur';
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

  private currentCompanyRank(): CompaniesLeaderboardRow | null {
    const companyId = this.dashboard()?.profile.company_id;
    if (!companyId) return null;
    return this.dashboard()?.companiesLeaderboard.find((row) => row.company_id === companyId) ?? null;
  }
}
