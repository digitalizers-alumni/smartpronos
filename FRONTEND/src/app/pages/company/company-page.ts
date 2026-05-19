import { Component } from '@angular/core';

@Component({
  selector: 'app-company-page',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center h-full w-full bg-tribbo-bg px-6">
      <div class="text-6xl mb-4">👥</div>
      <p class="font-inter text-gray-400 text-center text-sm leading-relaxed">
        Rejoins ou crée ta tribu pour participer
      </p>
    </div>
  `,
})
export class CompanyPage {}
