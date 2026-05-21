import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UserRankCard } from '../../shared/components/user-rank-card/user-rank-card';

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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  protected readonly userPoints = signal(1_240);
  protected readonly userRank = signal(4);
}
