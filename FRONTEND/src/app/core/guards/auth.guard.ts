import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TeamService } from '../../services/team.service';

export const authGuard = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const teamService = inject(TeamService);

  if (!auth.isAuthenticated()) {
    const restored = await auth.restoreSession();
    if (!restored) return router.parseUrl('/login');
  }

  try {
    const profile = await firstValueFrom(teamService.getUserProfile());
    if (!profile.favorite_team_id) {
      return router.parseUrl('/auth/select-team');
    }
  } catch (err) {
    console.error('[authGuard] Impossible de vérifier l’équipe favorite.', err);
    return router.parseUrl('/auth/select-team');
  }

  return true;
};
