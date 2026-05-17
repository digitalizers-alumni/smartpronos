import { MatchListItem } from '../models/match.models';
import { PredictionFormTeam } from '../models/prediction.models';

export interface MatchInfo {
  id: string;
  competition: string;
  stage: string;
  kickoff: Date;
  venue: string;
  homeTeam: PredictionFormTeam;
  awayTeam: PredictionFormTeam;
}

export const DEMO_MATCHES: MatchListItem[] = [
  {
    id: 'wc-2026-g1',
    kickoff: '2026-06-14T17:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe A',
    venue: 'Azteca · Mexico City',
    status: 'open',
    homeTeam: {
      name: 'Mexique',
      shortCode: 'MEX',
      flagUrl: 'https://flagcdn.com/w160/mx.png',
    },
    awayTeam: {
      name: 'Canada',
      shortCode: 'CAN',
      flagUrl: 'https://flagcdn.com/w160/ca.png',
    },
    prediction: { homeScore: 2, awayScore: 1, hasPrediction: true },
  },
  {
    id: 'wc-2026-g2',
    kickoff: '2026-06-14T20:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe B',
    venue: 'SoFi Stadium · Inglewood',
    status: 'open',
    homeTeam: {
      name: 'France',
      shortCode: 'FRA',
      flagUrl: 'https://flagcdn.com/w160/fr.png',
    },
    awayTeam: {
      name: 'Angleterre',
      shortCode: 'ENG',
      flagUrl: 'https://flagcdn.com/w160/gb-eng.png',
    },
    prediction: { homeScore: null, awayScore: null, hasPrediction: false },
  },
  {
    id: 'wc-2026-g3',
    kickoff: '2026-06-15T18:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe C',
    venue: 'Mercedes-Benz · Atlanta',
    status: 'locked',
    homeTeam: {
      name: 'Portugal',
      shortCode: 'POR',
      flagUrl: 'https://flagcdn.com/w160/pt.png',
    },
    awayTeam: {
      name: 'Maroc',
      shortCode: 'MAR',
      flagUrl: 'https://flagcdn.com/w160/ma.png',
    },
    prediction: { homeScore: 1, awayScore: 1, hasPrediction: true },
  },
  {
    id: 'wc-2026-g4',
    kickoff: '2026-06-10T16:00:00Z',
    competition: 'Coupe du Monde 2026',
    stage: 'Phase de groupes · Groupe D',
    venue: 'Hard Rock · Miami',
    status: 'finished',
    homeTeam: {
      name: 'Argentine',
      shortCode: 'ARG',
      flagUrl: 'https://flagcdn.com/w160/ar.png',
    },
    awayTeam: {
      name: 'États-Unis',
      shortCode: 'USA',
      flagUrl: 'https://flagcdn.com/w160/us.png',
    },
    prediction: { homeScore: 3, awayScore: 2, hasPrediction: true },
  },
];

export const DEMO_MATCH: MatchInfo = {
  id: 'wc-2026-r16-fra-bra',
  competition: 'Coupe du Monde 2026',
  stage: 'Huitièmes de finale',
  kickoff: new Date('2026-06-30T20:00:00Z'),
  venue: 'MetLife Stadium · East Rutherford',
  homeTeam: {
    name: 'France',
    shortCode: 'FRA',
    flagUrl: 'https://flagcdn.com/w160/fr.png',
    accentColor: 'var(--primary-container)',
  },
  awayTeam: {
    name: 'Brésil',
    shortCode: 'BRA',
    flagUrl: 'https://flagcdn.com/w160/br.png',
    accentColor: 'var(--secondary)',
  },
};
