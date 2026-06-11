import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../services/avatar.service';
import { PublicProfile, PublicProfileService } from '../../services/public-profile.service';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name || '?').slice(0, 2).toUpperCase();
}

@Component({
  selector: 'app-public-profile-page',
  standalone: true,
  templateUrl: './public-profile-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly avatarService = inject(AvatarService);
  private readonly publicProfileService = inject(PublicProfileService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly profile = signal<PublicProfile | null>(null);

  protected readonly displayName = computed(() =>
    this.profile()?.display_name ?? this.profile()?.username ?? 'Joueur'
  );
  protected readonly initials = computed(() => initials(this.displayName()));
  protected readonly avatarUrl = computed(() => this.avatarService.getPublicUrl(this.profile()?.avatar_path));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const userId = params.get('userId');
      if (!userId) {
        this.error.set('Profil introuvable.');
        this.loading.set(false);
        return;
      }
      if (userId === this.authService.currentUser()?.id) {
        this.router.navigateByUrl('/profile');
        return;
      }
      this.loadProfile(userId);
    });
  }

  private loadProfile(userId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.publicProfileService
      .getProfile(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          if (!profile) {
            this.error.set('Profil introuvable.');
            this.profile.set(null);
          } else {
            this.profile.set(profile);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[PublicProfilePage] Impossible de charger le profil public.', err);
          this.error.set('Impossible de charger ce profil.');
          this.profile.set(null);
          this.loading.set(false);
        },
      });
  }
}
