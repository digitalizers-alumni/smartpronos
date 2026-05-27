import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface LeaderboardPlayer {
  name: string;
  initials: string;
  company: string;
  points: number;
  isYou: boolean;
}

interface CompanyRow {
  id: string;
  name: string;
  code: string;
  type: 'company' | 'group';
  members: number;
  avgPoints: number;
  isMine: boolean;
}

const GLOBAL_LB: LeaderboardPlayer[] = [
  { name: 'Sophie L.', initials: 'SL', company: 'Rolex', points: 142, isYou: false },
  { name: 'Marc D.', initials: 'MD', company: 'Patek Philippe SA', points: 138, isYou: false },
  { name: 'Léna K.', initials: 'LK', company: 'Omega', points: 131, isYou: false },
  { name: 'Ryen K.', initials: 'RK', company: 'Audemars Piguet', points: 124, isYou: true },
  { name: 'Thomas B.', initials: 'TB', company: 'TAG Heuer', points: 118, isYou: false },
  { name: 'Camille R.', initials: 'CR', company: 'Breitling', points: 112, isYou: false },
  { name: 'Hugo M.', initials: 'HM', company: 'Genève United FC', points: 107, isYou: false },
  { name: 'Emma S.', initials: 'ES', company: 'Watch Valley ⌚', points: 98, isYou: false },
  { name: 'Lucas P.', initials: 'LP', company: 'Patek Philippe SA', points: 92, isYou: false },
  { name: 'Sarah W.', initials: 'SW', company: 'Rolex', points: 87, isYou: false },
  { name: 'Alex F.', initials: 'AF', company: 'Omega', points: 76, isYou: false },
  { name: 'Julie N.', initials: 'JN', company: 'TAG Heuer', points: 63, isYou: false },
];

const COMPANY_MEMBERS: LeaderboardPlayer[] = [
  { name: 'Léo P.', initials: 'LP', company: 'Audemars Piguet', points: 157, isYou: false },
  { name: 'Ryen K.', initials: 'RK', company: 'Audemars Piguet', points: 124, isYou: true },
  { name: 'Clara M.', initials: 'CM', company: 'Audemars Piguet', points: 109, isYou: false },
  { name: 'Noah V.', initials: 'NV', company: 'Audemars Piguet', points: 88, isYou: false },
  { name: 'Zoe B.', initials: 'ZB', company: 'Audemars Piguet', points: 72, isYou: false },
];

const COMPANIES: CompanyRow[] = [
  { id: 'rolex', name: 'Rolex', code: 'RX', type: 'company', members: 42, avgPoints: 112, isMine: false },
  { id: 'watchvalley', name: 'Watch Valley ⌚', code: 'WV', type: 'group', members: 34, avgPoints: 104, isMine: false },
  { id: 'patek', name: 'Patek Philippe SA', code: 'PP', type: 'company', members: 12, avgPoints: 98, isMine: false },
  { id: 'ap', name: 'Audemars Piguet', code: 'AP', type: 'company', members: 28, avgPoints: 91, isMine: true },
  { id: 'geneva', name: 'Genève United FC', code: 'GU', type: 'group', members: 18, avgPoints: 88, isMine: false },
  { id: 'omega', name: 'Omega', code: 'OM', type: 'company', members: 35, avgPoints: 84, isMine: false },
  { id: 'tag', name: 'TAG Heuer', code: 'TH', type: 'company', members: 19, avgPoints: 71, isMine: false },
  { id: 'breitling', name: 'Breitling', code: 'BR', type: 'company', members: 24, avgPoints: 63, isMine: false },
];

const AVATAR_COLORS = ['#1D4DFF', '#19C95B', '#FF3B43', '#6B8AFF', '#9B5DE5', '#F15BB5', '#00BBF9', '#E6A700'];

function avatarColor(name: string): string {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  templateUrl: './leaderboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardPage {
  protected readonly activeTab = signal<'global' | 'tribu' | 'companies'>('global');
  protected readonly tabs = [
    { key: 'global' as const, label: 'Global' },
    { key: 'tribu' as const, label: 'Ma Tribu' },
    { key: 'companies' as const, label: 'Tribus' },
  ];

  protected readonly globalLb = GLOBAL_LB;
  protected readonly companyMembers = COMPANY_MEMBERS;
  protected readonly companies = COMPANIES;
  protected readonly me = GLOBAL_LB.find((p) => p.isYou)!;

  protected readonly userRank = 4;
  protected readonly userTotalPlayers = 12;

  protected avatarColor = avatarColor;

  protected setTab(key: 'global' | 'tribu' | 'companies'): void {
    this.activeTab.set(key);
  }
}
