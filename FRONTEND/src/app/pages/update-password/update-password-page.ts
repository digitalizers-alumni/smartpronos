import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-update-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './update-password-page.html',
})
export class UpdatePasswordPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected newPassword = '';
  protected confirmPassword = '';
  protected showPassword = false;
  protected submitting = signal(false);
  protected error = signal('');
  protected success = signal(false);
  protected ready = signal(false);
  protected expired = signal(false);

  async ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      const ok = await this.authService.restoreSession();
      if (!ok) {
        this.expired.set(true);
        return;
      }
    }
    this.ready.set(true);
  }

  protected async submit(): Promise<void> {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Les mots de passe ne correspondent pas');
      return;
    }
    if (!/[A-Z]/.test(this.newPassword)) {
      this.error.set('Doit contenir une majuscule');
      return;
    }
    if (!/[a-z]/.test(this.newPassword)) {
      this.error.set('Doit contenir une minuscule');
      return;
    }
    if (!/[0-9]/.test(this.newPassword)) {
      this.error.set('Doit contenir un chiffre');
      return;
    }
    if (this.newPassword.length < 8) {
      this.error.set('Minimum 8 caractères');
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    try {
      await this.authService.updatePassword(this.newPassword);
      this.success.set(true);
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du changement.';
      this.error.set(msg);
      this.submitting.set(false);
    }
  }
}
