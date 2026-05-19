import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly router = inject(Router);

  protected hidePassword = true;
  protected errorMessage = signal('');

  protected readonly loginForm;

  constructor(private readonly fb: FormBuilder) {
    this.loginForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  protected async submit(): Promise<void> {
    this.errorMessage.set('');
    await this.router.navigate(['/home', 'match-list']);
  }
}
