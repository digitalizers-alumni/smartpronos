import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { TopAppBar } from './shared/components/top-app-bar/top-app-bar';
import { BottomNav } from './shared/components/bottom-nav/bottom-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopAppBar, BottomNav],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

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
    return u === '/' || u === '/login' || u === '/signup';
  });

  protected navigateTo(url: string): void {
    this.router.navigateByUrl(url);
  }

  protected isActive(url: string): boolean {
    return this.currentUrl() === url;
  }
}
