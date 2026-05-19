import { Routes } from '@angular/router';

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
    path: 'match/:matchId/prediction-form',
    loadComponent: () =>
      import('./pages/prediction-form/prediction-form-page').then(
        (m) => m.PredictionFormPage,
      ),
  },
  {
    path: 'home/match-list',
    loadComponent: () =>
      import('./pages/match-list/match-list-page').then((m) => m.MatchListPage),
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./pages/leaderboard/leaderboard-page').then((m) => m.LeaderboardPage),
  },
  {
    path: 'company',
    loadComponent: () =>
      import('./pages/company/company-page').then((m) => m.CompanyPage),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: '**',
    redirectTo: '/home/match-list',
  },
];
