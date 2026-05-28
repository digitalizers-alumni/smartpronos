import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TeamService, UserProfile } from '../../services/team.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [],
  templateUrl: './profile-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  protected readonly authService = inject(AuthService);
  private readonly teamService = inject(TeamService);
  private readonly router = inject(Router);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly loggingOut = signal(false);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly deleteConfirmText = signal('');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal('');

  protected readonly displayName = computed(() => {
    const email = this.authService.currentUser()?.email;
    if (email) {
      const parts = email.split('@')[0].split(/[._]/).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const lastInit = parts[1].charAt(0).toUpperCase();
        return `${first} ${lastInit}.`;
      }
      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }
    return this.profile()?.username ?? 'Joueur';
  });

  protected readonly initials = computed(() => {
    const email = this.authService.currentUser()?.email;
    if (email) {
      const parts = email.split('@')[0].split(/[._]/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    }
    return '?';
  });

  constructor() {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.teamService.getUserProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.profile.set({
          total_points: 0,
          exact_count: 0,
          total_predictions: 0,
          rank: null,
          favorite_team_id: null,
          favorite_team_code: null,
          favorite_team_name: null,
          favorite_team_flag: null,
          username: null,
        });
        this.loading.set(false);
      },
    });
  }

  protected openDeleteConfirm(): void {
    this.showDeleteConfirm.set(true);
    this.deleteConfirmText.set('');
    this.deleteError.set('');
    document.body.style.overflow = 'hidden';
  }

  protected closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deleteConfirmText.set('');
    this.deleteError.set('');
    document.body.style.overflow = '';
  }

  protected async confirmDelete(): Promise<void> {
    if (this.deleteConfirmText() !== 'SUPPRIMER') return;
    this.deleting.set(true);
    this.deleteError.set('');

    this.teamService.deleteMyAccount().subscribe({
      next: async () => {
        this.authService.currentUser.set(null);
        document.body.style.overflow = '';
        await this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.deleteError.set(err?.message || 'Erreur lors de la suppression.');
        this.deleting.set(false);
      },
    });
  }

  protected async handleLogout() {
    this.loggingOut.set(true);
    try {
      await this.authService.signOut();
    } catch {
      this.authService.currentUser.set(null);
    } finally {
      this.loggingOut.set(false);
      this.router.navigateByUrl('/');
    }
  }
}
