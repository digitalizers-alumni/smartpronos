import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserRankCard } from '../../shared/components/user-rank-card/user-rank-card';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [UserRankCard],
  template: `
    <div class="flex flex-col h-full w-full bg-tribbo-bg px-4 py-6 md:px-8 md:py-8 space-y-6">
      <app-user-rank-card [points]="userPoints()" [rank]="userRank()" label="Mes points" />

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 class="font-archivo text-base text-tribbo-text uppercase tracking-tight">Profil</h2>
        <p class="font-inter text-gray-400 text-sm">Ton profil s'affichera ici après connexion complète.</p>
      </div>

      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 class="font-archivo text-base text-tribbo-text uppercase tracking-tight">Compte</h2>
        <button (click)="handleLogout()"
          [disabled]="loggingOut()"
          class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 font-inter text-sm font-medium hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          @if (loggingOut()) {
            <span class="inline-block w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></span>
          } @else {
            <span class="material-symbols-outlined text-lg">logout</span>
          }
          Déconnexion
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly userPoints = signal(1_240);
  protected readonly userRank = signal(4);
  protected readonly loggingOut = signal(false);

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
