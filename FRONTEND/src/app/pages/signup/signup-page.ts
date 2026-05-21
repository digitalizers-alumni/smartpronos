import { Component, signal, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.html',
})
export class SignupPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected isPasswordVisible = false;
  protected errorMessage = signal('');
  protected submitting = signal(false);

  protected readonly signupForm;

  constructor(private readonly fb: FormBuilder) {
    this.signupForm = this.fb.nonNullable.group({
      firstname: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: passwordsMatch });
  }

  protected needsEmailConfirmation = signal(false);

  protected async submit(): Promise<void> {
    if (this.signupForm.invalid || this.submitting()) return;

    this.errorMessage.set('');
    this.submitting.set(true);

    try {
      const { email, password } = this.signupForm.getRawValue();
      const result = await this.authService.signUp(email, password);
      if (result?.session) {
        await this.router.navigate(['/home', 'match-list']);
      } else {
        this.needsEmailConfirmation.set(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Inscription impossible.';
      this.errorMessage.set(msg);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async skipConfirmation(): Promise<void> {
    await this.authService.signOut().catch(() => {});
    await this.router.navigate(['/home', 'match-list']);
  }

  protected getControlError(controlName: string): string | null {
    const control = this.signupForm.get(controlName);
    if (!control || !control.touched) return null;
    if (control.hasError('required')) return 'Ce champ est requis';
    if (control.hasError('email')) return 'Email invalide';
    if (control.hasError('minlength')) return 'Minimum 8 caractères';
    if (controlName === 'confirmPassword' && this.signupForm.hasError('passwordsMismatch') && control.touched) return 'Les mots de passe ne correspondent pas';
    return null;
  }
}
