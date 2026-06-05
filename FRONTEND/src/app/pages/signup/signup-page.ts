import { Component, signal, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TeamService, Team } from '../../services/team.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordsMismatch: true };
  }
  return null;
}

function passwordComplexity(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  const errors: Record<string, boolean> = {};
  if (!/[A-Z]/.test(value)) errors['missingUppercase'] = true;
  if (!/[a-z]/.test(value)) errors['missingLowercase'] = true;
  if (!/[0-9]/.test(value)) errors['missingDigit'] = true;
  return Object.keys(errors).length ? errors : null;
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
  private readonly teamService = inject(TeamService);

  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected errorMessage = signal('');
  protected submitting = signal(false);

  protected readonly signupForm;

  protected step = signal<'form' | 'team'>('form');
  protected teams = signal<Team[]>([]);
  protected selectedTeamId = signal<string | null>(null);
  protected savingTeam = signal(false);

  constructor(private readonly fb: FormBuilder) {
    this.signupForm = this.fb.nonNullable.group({
      firstname: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: passwordsMatch });
  }

  protected needsEmailConfirmation = signal(false);

  protected async submit(): Promise<void> {
    if (this.signupForm.invalid || this.submitting()) return;

    this.errorMessage.set('');
    this.submitting.set(true);

    try {
      const { firstname, lastname, email, password } = this.signupForm.getRawValue();
      const result = await this.authService.signUp(email, password, {
        firstName: firstname.trim(),
        lastName: lastname.trim(),
      });
      if (result?.session) {
        this.teamService.getTeams().subscribe({
          next: (teams) => {
            this.teams.set(teams);
            this.step.set('team');
            this.submitting.set(false);
          },
          error: (err) => {
            console.error('[SignupPage] Impossible de charger les équipes.', err);
            this.errorMessage.set('Compte créé, mais impossible de charger les équipes. Réessaie plus tard depuis ton profil.');
            this.submitting.set(false);
          },
        });
      } else {
        this.needsEmailConfirmation.set(true);
        this.submitting.set(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Inscription impossible.';
      this.errorMessage.set(msg);
      this.submitting.set(false);
    }
  }

  protected selectTeam(teamId: string): void {
    this.selectedTeamId.set(this.selectedTeamId() === teamId ? null : teamId);
  }

  protected revealPassword(field: 'password' | 'confirmPassword', event: Event): void {
    event.preventDefault();
    if (field === 'password') {
      this.passwordVisible.set(true);
      return;
    }
    this.confirmPasswordVisible.set(true);
  }

  protected hidePassword(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.passwordVisible.set(false);
      return;
    }
    this.confirmPasswordVisible.set(false);
  }

  protected async confirmTeam(): Promise<void> {
    const teamId = this.selectedTeamId();
    if (!teamId) {
      this.errorMessage.set('Choisis une équipe de cœur pour continuer.');
      return;
    }

    this.savingTeam.set(true);
    this.errorMessage.set('');
    this.teamService.setFavoriteTeam(teamId).subscribe({
      next: () => this.router.navigate(['/home', 'match-list']),
      error: (err) => {
        console.error('[SignupPage] Impossible de sauvegarder l’équipe favorite.', err);
        this.errorMessage.set('Impossible de sauvegarder ton équipe favorite. Réessaie dans un instant.');
        this.savingTeam.set(false);
      },
    });
  }

  protected getControlError(controlName: string): string | null {
    const control = this.signupForm.get(controlName);
    if (!control || !control.touched) return null;
    if (control.hasError('required')) return 'Ce champ est requis';
    if (control.hasError('email')) return 'Email invalide';
    if (control.hasError('minlength')) return 'Minimum 8 caractères';
    if (control.hasError('missingUppercase')) return 'Doit contenir une majuscule';
    if (control.hasError('missingLowercase')) return 'Doit contenir une minuscule';
    if (control.hasError('missingDigit')) return 'Doit contenir un chiffre';
    if (controlName === 'confirmPassword' && this.signupForm.hasError('passwordsMismatch') && control.touched) return 'Les mots de passe ne correspondent pas';
    return null;
  }
}
