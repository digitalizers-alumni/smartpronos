import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/closure/closure-page').then((m) => m.ClosurePage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
