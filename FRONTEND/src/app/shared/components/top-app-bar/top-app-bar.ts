import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-top-app-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './top-app-bar.html',
  styleUrl: './top-app-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopAppBar {
  readonly backRoute = input<string | null>(null);
  readonly title = input<string>('SMARTPRONOS');
}
