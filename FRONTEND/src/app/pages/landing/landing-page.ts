import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TopAppBar } from '../../shared/components/top-app-bar/top-app-bar';

interface Feature {
  icon: string;
  iconColor: string;
  borderColor: string;
  title: string;
  description: string;
}

interface Stat {
  value: string;
  label: string;
  color: string;
}

interface NavLink {
  label: string;
  href: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, TopAppBar],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  protected readonly features: Feature[] = [
    {
      icon: 'public',
      iconColor: 'var(--primary-container)',
      borderColor: 'var(--primary-container)',
      title: 'Pronostics Mondiaux',
      description:
        'Participez au plus grand événement sportif de 2026. Pronostiquez chaque match, des phases de groupes à la grande finale en Amérique du Nord.',
    },
    {
      icon: 'groups',
      iconColor: 'var(--error)',
      borderColor: 'var(--error)',
      title: 'Défis entre Amis',
      description:
        'Créez des ligues privées exclusives. Invitez vos collègues, votre famille ou vos amis pour déterminer qui est le véritable expert du ballon rond.',
    },
    {
      icon: 'leaderboard',
      iconColor: 'var(--secondary)',
      borderColor: 'var(--secondary)',
      title: 'Classements en Direct',
      description:
        'Suivez votre progression en temps réel. Nos classements dynamiques s\'ajustent à chaque but marqué durant le tournoi.',
    },
  ];

  protected readonly stats: Stat[] = [
    { value: '1M+', label: 'Pronostiqueurs Inscrits', color: 'var(--secondary)' },
    { value: '500k+', label: 'Ligues Privées Créées', color: 'var(--error)' },
  ];

  protected readonly navLinks: NavLink[] = [
    { label: 'Règlement', href: '#' },
    { label: 'FAQ', href: '#' },
    { label: 'Contact', href: '#' },
  ];
}
