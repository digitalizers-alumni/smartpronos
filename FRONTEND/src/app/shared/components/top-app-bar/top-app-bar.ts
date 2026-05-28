import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-top-app-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="h-14 w-full bg-tribbo-surface flex items-center px-4 justify-between shrink-0 border-b border-gray-200">
      <button
        routerLink="/"
        class="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img src="assets/logo-tribbo-mark.svg" class="w-9 h-9 object-contain" alt="Tribbo" />
        <span class="font-archivo text-base text-tribbo-text uppercase tracking-tight leading-none">Tribbo</span>
      </button>
      <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
        <span class="material-symbols-outlined text-xl">notifications</span>
      </button>
    </div>
  `,
})
export class TopAppBar {}
