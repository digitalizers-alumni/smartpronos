import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-user-rank-card',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-inter text-sm text-gray-500 font-medium">{{ label() }}</p>
          <div class="font-space text-3xl md:text-4xl font-bold text-tribbo-text mt-1">
            {{ points() | number }}
          </div>
        </div>
        <div class="text-right">
          <p class="font-inter text-sm text-gray-500 font-medium">Classement</p>
          <div class="font-space text-2xl md:text-3xl font-bold text-tribbo-primary mt-1">#{{ rank() }}</div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserRankCard {
  readonly points = input.required<number>();
  readonly rank = input.required<number>();
  readonly label = input<string>('Mes points');
}
