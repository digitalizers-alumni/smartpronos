import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../services/auth.service';

export const publicOnlyGuard = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const teamService = inject(TeamService);

  if (!auth.isAuthenticated()) {
    await auth.restoreSession();
  }

  if (!auth.isAuthenticated()) {
    return true;
  }

  try {
    const profile = await firstValueFrom(teamService.getUserProfile());
    if (!profile.favorite_team_id) {
      return router.parseUrl('/auth/select-team');
    }
  } catch (err) {
    console.error('[publicOnlyGuard] Impossible de vérifier l’équipe favorite.', err);
    return router.parseUrl('/auth/select-team');
  }

  return router.parseUrl('/home/match-list');
};
