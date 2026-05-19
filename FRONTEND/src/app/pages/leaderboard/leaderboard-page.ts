import { Component } from '@angular/core';

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center h-full w-full bg-tribbo-bg px-6">
      <div class="text-6xl mb-4">🏆</div>
      <p class="font-inter text-gray-400 text-center text-sm leading-relaxed">
        Classement disponible après le premier match
      </p>
    </div>
  `,
})
export class LeaderboardPage {}
