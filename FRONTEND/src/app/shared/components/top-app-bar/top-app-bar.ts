import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-top-app-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="h-14 w-full bg-tribbo-surface flex items-center px-4 justify-between shrink-0 border-b border-gray-200">
      <button
        routerLink="/home/match-list"
        class="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img src="assets/logo-tribbo-mark.svg" class="w-9 h-9 object-contain" alt="Tribbo" />
        <span class="font-archivo text-base text-tribbo-text uppercase tracking-tight leading-none">Tribbo</span>
      </button>
      <div class="relative" (click)="keepUserMenuOpen($event)">
        <button
          type="button"
          (click)="toggleUserMenu()"
          class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-tribbo-primary hover:bg-tribbo-primary/5 transition-colors"
          aria-label="Menu utilisateur"
        >
          <span class="material-symbols-outlined text-xl">emoji_events</span>
        </button>
        @if (userMenuOpen()) {
          <div class="absolute right-0 top-10 z-50 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg">
            <button
              type="button"
              (click)="navigateToProfile()"
              class="w-full rounded-xl px-3 py-2 text-left font-inter text-sm font-semibold text-tribbo-text hover:bg-gray-50 transition-colors"
            >
              Profil
            </button>
            <button
              type="button"
              (click)="signOut()"
              class="w-full rounded-xl px-3 py-2 text-left font-inter text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class TopAppBar {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly userMenuOpen = signal(false);

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected keepUserMenuOpen(event: Event): void {
    event.stopPropagation();
  }

  protected navigateToProfile(): void {
    this.userMenuOpen.set(false);
    this.router.navigateByUrl('/profile');
  }

  protected async signOut(): Promise<void> {
    this.userMenuOpen.set(false);
    await this.authService.signOut();
    this.router.navigateByUrl('/login');
  }

  @HostListener('document:click')
  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }
}
