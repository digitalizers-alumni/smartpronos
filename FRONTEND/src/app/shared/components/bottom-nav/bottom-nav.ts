import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="min-h-16 w-full bg-tribbo-surface border-t border-gray-200 flex items-center justify-around shrink-0 pb-[env(safe-area-inset-bottom)]">
      @for (item of navItems; track item.route) {
        <a
          [routerLink]="[item.route]"
          routerLinkActive="text-tribbo-primary"
          class="flex flex-col items-center justify-center w-16 h-full gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span class="material-symbols-outlined">{{ item.icon }}</span>
          <span class="text-[10px] font-medium font-inter">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
})
export class BottomNav {
  protected readonly navItems: NavItem[] = [
    { icon: 'home', label: 'Accueil', route: '/home/match-list' },
    { icon: 'leaderboard', label: 'Classement', route: '/leaderboard' },
    { icon: 'groups', label: 'Tribu', route: '/tribe' },
  ];
}
