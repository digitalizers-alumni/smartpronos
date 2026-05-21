import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected hidePassword = true;
  protected errorMessage = signal('');
  protected submitting = signal(false);

  protected readonly loginForm;

  constructor(private readonly fb: FormBuilder) {
    this.loginForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  protected async submit(): Promise<void> {
    if (this.loginForm.invalid || this.submitting()) return;

    this.errorMessage.set('');
    this.submitting.set(true);

    try {
      const { email, password } = this.loginForm.getRawValue();
      await this.authService.signIn(email, password);
      await this.router.navigate(['/home', 'match-list']);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Identifiants incorrects.';
      this.errorMessage.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }
}
