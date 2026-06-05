import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../services/avatar.service';
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
  private readonly avatarService = inject(AvatarService);
  private readonly router = inject(Router);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly profileError = signal<string | null>(null);
  protected readonly loggingOut = signal(false);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly deleteConfirmText = signal('');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal('');
  protected readonly showChangePassword = signal(false);
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly changingPassword = signal(false);
  protected readonly changePasswordError = signal('');
  protected readonly changePasswordSuccess = signal(false);
  protected readonly displayNameDraft = signal('');
  protected readonly savingDisplayName = signal(false);
  protected readonly displayNameError = signal('');
  protected readonly displayNameSuccess = signal(false);
  protected readonly uploadingAvatar = signal(false);
  protected readonly avatarError = signal('');
  protected readonly avatarSuccess = signal(false);

  protected readonly displayName = computed(() => {
    const profile = this.profile();
    return profile?.display_name ?? profile?.username ?? '';
  });

  protected readonly initials = computed(() => {
    const name = this.displayName().trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  protected readonly avatarUrl = computed(() => this.avatarService.getPublicUrl(this.profile()?.avatar_path));

  constructor() {
    this.loadProfile();
  }

  protected loadProfile(): void {
    this.loading.set(true);
    this.profileError.set(null);
    this.teamService.getUserProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.displayNameDraft.set(profile.display_name ?? profile.username ?? '');
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[ProfilePage] Impossible de charger le profil.', err);
        this.profile.set(null);
        this.profileError.set('Impossible de charger ton profil depuis la base locale.');
        this.loading.set(false);
      },
    });
  }

  protected saveDisplayName(): void {
    const nextName = this.displayNameDraft().trim();
    if (!nextName) {
      this.displayNameError.set('Entre un nom affiché.');
      return;
    }
    if (nextName.length < 2 || nextName.length > 40) {
      this.displayNameError.set('Le nom affiché doit contenir entre 2 et 40 caractères.');
      return;
    }

    this.savingDisplayName.set(true);
    this.displayNameError.set('');
    this.displayNameSuccess.set(false);
    this.teamService.updateDisplayName(nextName).subscribe({
      next: () => {
        this.displayNameSuccess.set(true);
        this.savingDisplayName.set(false);
        this.loadProfile();
      },
      error: (err) => {
        console.error('[ProfilePage] Impossible de mettre à jour le nom affiché.', err);
        this.displayNameError.set(err instanceof Error ? err.message : 'Nom affiché impossible à mettre à jour.');
        this.savingDisplayName.set(false);
      },
    });
  }

  protected async updateAvatar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadingAvatar.set(true);
    this.avatarError.set('');
    this.avatarSuccess.set(false);
    try {
      const avatarPath = await this.avatarService.updateProfileAvatar(file);
      this.profile.update((profile) => profile ? { ...profile, avatar_path: avatarPath } : profile);
      this.avatarSuccess.set(true);
    } catch (err) {
      console.error('[ProfilePage] Impossible de mettre à jour la photo.', err);
      this.avatarError.set(err instanceof Error ? err.message : 'Photo impossible à mettre à jour.');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  protected async deleteAvatar(): Promise<void> {
    this.uploadingAvatar.set(true);
    this.avatarError.set('');
    this.avatarSuccess.set(false);
    try {
      await this.avatarService.deleteProfileAvatar();
      this.profile.update((profile) => profile ? { ...profile, avatar_path: null } : profile);
      this.avatarSuccess.set(true);
    } catch (err) {
      console.error('[ProfilePage] Impossible de supprimer la photo.', err);
      this.avatarError.set(err instanceof Error ? err.message : 'Photo impossible à supprimer.');
    } finally {
      this.uploadingAvatar.set(false);
    }
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

  protected openChangePassword(): void {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.changePasswordError.set('');
    this.changePasswordSuccess.set(false);
    this.showChangePassword.set(true);
    document.body.style.overflow = 'hidden';
  }

  protected closeChangePassword(): void {
    this.showChangePassword.set(false);
    document.body.style.overflow = '';
  }

  protected async confirmChangePassword(): Promise<void> {
    const pwd = this.newPassword();
    if (!this.currentPassword()) {
      this.changePasswordError.set('Tape ton mot de passe actuel');
      return;
    }
    if (pwd !== this.confirmPassword()) {
      this.changePasswordError.set('Les mots de passe ne correspondent pas');
      return;
    }
    if (pwd.length < 8) {
      this.changePasswordError.set('Minimum 8 caractères');
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      this.changePasswordError.set('Doit contenir une majuscule');
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      this.changePasswordError.set('Doit contenir une minuscule');
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      this.changePasswordError.set('Doit contenir un chiffre');
      return;
    }

    this.changingPassword.set(true);
    this.changePasswordError.set('');

    try {
      const email = this.authService.currentUser()?.email;
      if (!email) {
        this.changePasswordError.set('Session invalide, reconnecte-toi.');
        this.changingPassword.set(false);
        return;
      }
      await this.authService.signIn(email, this.currentPassword());
      await this.authService.updatePassword(pwd);
      this.changePasswordSuccess.set(true);
      setTimeout(() => {
        this.closeChangePassword();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du changement.';
      if (msg.includes('Invalid login credentials')) {
        this.changePasswordError.set('Mot de passe actuel incorrect');
      } else {
        this.changePasswordError.set(msg);
      }
    } finally {
      this.changingPassword.set(false);
    }
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
