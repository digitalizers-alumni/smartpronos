import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inscription-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inscription-page.html',
  styleUrl: './inscription-page.scss',
})
export class InscriptionPage {
  protected isPasswordVisible = false;

  protected togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
  }
}
