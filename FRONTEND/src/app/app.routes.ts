import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./landing-page/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./inscription-page/inscription-page').then((m) => m.InscriptionPage),
  },
  {
    path: 'match/prediction-form',
    loadComponent: () =>
      import('./pages/match/prediction-form/prediction-form-page').then(
        (m) => m.PredictionFormPage,
      ),
  },
  {
    path: 'match/:matchId/prediction-form',
    loadComponent: () =>
      import('./pages/match/prediction-form/prediction-form-page').then(
        (m) => m.PredictionFormPage,
      ),
  },
  {
    path: 'home/match-list',
    loadComponent: () =>
      import('./pages/home/match-list/match-list-page').then((m) => m.MatchListPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
