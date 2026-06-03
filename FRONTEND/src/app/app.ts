import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { TopAppBar } from './shared/components/top-app-bar/top-app-bar';
import { BottomNav } from './shared/components/bottom-nav/bottom-nav';
import { AuthService } from './core/services/auth.service';
import { PredictionProgressService } from './services/prediction-progress.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  protected readonly predictionProgress = inject(PredictionProgressService);
  protected readonly userMenuOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly currentUrl = computed(() => this.url());

  protected readonly isAuthScreen = computed(() => {
    const u = this.currentUrl();
    return u === '/login' || u === '/signup';
  });

  protected readonly isLandingPage = computed(() => {
    return this.currentUrl() === '/';
  });

  protected readonly showAppChrome = computed(() => {
    return !this.isAuthScreen() && !this.isLandingPage();
  });

  constructor() {
    effect(() => {
      if (this.showAppChrome() && this.authService.isAuthenticated()) {
        this.predictionProgress.refresh();
      } else {
        this.predictionProgress.reset();
      }
    });
  }

  protected navigateTo(url: string): void {
    this.userMenuOpen.set(false);
    this.router.navigateByUrl(url);
  }

  protected isActive(url: string): boolean {
    return this.currentUrl() === url;
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected keepUserMenuOpen(event: Event): void {
    event.stopPropagation();
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
