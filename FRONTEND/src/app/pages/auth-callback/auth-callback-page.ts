import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TeamService, Team } from '../../services/team.service';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  imports: [],
  templateUrl: './auth-callback-page.html',
})
export class AuthCallbackPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly teamService = inject(TeamService);
  private readonly router = inject(Router);

  protected authLoading = signal(true);
  protected teamsLoading = signal(true);
  protected error = signal(false);
  protected teams = signal<Team[]>([]);
  protected selectedTeamId = signal<string | null>(null);
  protected searchQuery = signal('');
  protected saving = signal(false);
  protected errorMessage = signal('');

  protected selectedTeam = computed(() => {
    const id = this.selectedTeamId();
    if (!id) return null;
    return this.teams().find(t => t.id === id) ?? null;
  });

  protected filteredTeams = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.teams();
    return this.teams().filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q)
    );
  });

  async ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      await this.authService.restoreSession();
    }

    if (!this.authService.isAuthenticated()) {
      await this.router.navigate(['/login']);
      return;
    }

    this.teamService.getUserProfile().subscribe({
      next: (profile) => {
        if (profile.favorite_team_id) {
          this.router.navigate(['/home', 'match-list']);
        } else {
          this.authLoading.set(false);
          this.loadTeams();
        }
      },
      error: () => {
        this.authLoading.set(false);
        this.loadTeams();
      },
    });
  }

  private loadTeams(): void {
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.teamsLoading.set(false);
      },
      error: () => {
        this.teamsLoading.set(false);
        this.error.set(true);
      },
    });
  }

  protected selectTeam(teamId: string): void {
    this.selectedTeamId.set(this.selectedTeamId() === teamId ? null : teamId);
  }

  protected async confirmTeam(): Promise<void> {
    const teamId = this.selectedTeamId();
    if (!teamId) {
      this.errorMessage.set('Choisis une équipe de cœur pour continuer.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    this.teamService.setFavoriteTeam(teamId).subscribe({
      next: async () => {
        await this.router.navigate(['/home', 'match-list']);
      },
      error: async (err) => {
        this.saving.set(false);
        const msg = err?.message || '';
        if (msg.includes('Could not find the function') || msg.includes('schema cache')) {
          this.errorMessage.set('Cette fonctionnalité n\'est pas encore disponible. Contacte le support.');
        } else if (msg.includes('JWT')) {
          this.errorMessage.set('Session expirée. Reconnecte-toi.');
        } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          this.errorMessage.set('Problème de connexion. Vérifie ta connexion internet.');
        } else {
          this.errorMessage.set(msg);
        }
      },
    });
  }
}
