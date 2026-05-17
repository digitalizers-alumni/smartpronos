import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.scss',
})
export class SignupPage {
  protected isPasswordVisible = false;

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

  protected submit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    // TODO: wire with AuthService
    console.log('Signup payload:', this.signupForm.getRawValue());
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
