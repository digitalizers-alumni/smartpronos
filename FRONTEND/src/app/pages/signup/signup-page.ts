import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.scss',
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected isPasswordVisible = false;
  protected errorMessage = signal('');

  protected readonly signupForm;

  constructor(private readonly fb: FormBuilder) {
    this.signupForm = this.fb.nonNullable.group({
      fullname: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  protected togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  protected async submit(): Promise<void> {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');

    try {
      const { email, password } = this.signupForm.getRawValue();
      await this.auth.signUp(email, password);
      await this.router.navigate(['/home', 'match-list']);
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : "Erreur d'inscription",
      );
    }
  }

  protected getControlError(controlName: 'fullname' | 'email' | 'password'): string | null {
    const control = this.signupForm.controls[controlName];
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Ce champ est requis';
    }
    if (control.hasError('email')) {
      return 'Email invalide';
    }
    if (control.hasError('minlength')) {
      return controlName === 'password'
        ? 'Minimum 8 caractères'
        : 'Minimum 2 caractères';
    }
    return null;
  }
}
