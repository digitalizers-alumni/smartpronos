import { Component } from '@angular/core';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center h-full w-full bg-tribbo-bg px-6">
      <div class="text-6xl mb-4">🔐</div>
      <p class="font-inter text-gray-400 text-center text-sm leading-relaxed">
        Ton profil s'affichera ici après connexion
      </p>
    </div>
  `,
})
export class ProfilePage {}
