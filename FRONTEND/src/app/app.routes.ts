import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup-page').then((m) => m.SignupPage),
  },
  {
    path: 'match/:matchId/detail',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/match/detail/match-detail-page').then(
        (m) => m.MatchDetailPage,
      ),
  },
  {
    path: 'match/:matchId/prediction-form',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/prediction-form/prediction-form-page').then(
        (m) => m.PredictionFormPage,
      ),
  },
  {
    path: 'home/match-list',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/match-list/match-list-page').then((m) => m.MatchListPage),
  },
  {
    path: 'leaderboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/leaderboard/leaderboard-page').then((m) => m.LeaderboardPage),
  },
  {
    path: 'tribe',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/tribe/tribe-page').then((m) => m.TribePage),
  },
  {
    path: 'company',
    redirectTo: '/tribe',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback-page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'auth/update-password',
    loadComponent: () =>
      import('./pages/update-password/update-password-page').then((m) => m.UpdatePasswordPage),
  },
  {
    path: '**',
    redirectTo: '/home/match-list',
  },
];
