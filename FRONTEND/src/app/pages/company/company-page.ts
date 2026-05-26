import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface TribeMember {
  name: string;
  initials: string;
  points: number;
  isYou: boolean;
  noPred: boolean;
}

const ACTIVE_MEMBERS: TribeMember[] = [
  { name: 'Léo P.', initials: 'LP', points: 157, isYou: false, noPred: false },
  { name: 'Ryen K.', initials: 'RK', points: 124, isYou: true, noPred: false },
  { name: 'Clara M.', initials: 'CM', points: 109, isYou: false, noPred: false },
  { name: 'Noah V.', initials: 'NV', points: 88, isYou: false, noPred: false },
  { name: 'Zoe B.', initials: 'ZB', points: 0, isYou: false, noPred: true },
];

const AVATAR_COLORS = ['#1D4DFF', '#19C95B', '#FF3B43', '#6B8AFF', '#9B5DE5', '#F15BB5', '#00BBF9', '#E6A700'];

function avatarColor(name: string): string {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

@Component({
  selector: 'app-company-page',
  standalone: true,
  templateUrl: './company-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyPage {
  protected readonly hasTribe = signal(true);
  protected readonly tribeName = 'Audemars Piguet';
  protected readonly tribeCode = 'AP';
  protected readonly tribeType: 'company' | 'group' = 'company';
  protected readonly members = ACTIVE_MEMBERS;
  protected readonly memberCount = 28;
  protected readonly tribeRank = 4;
  protected readonly totalTribes = 8;
  protected readonly rivalName = 'Patek Philippe SA';
  protected readonly rivalGap = 7;

  protected avatarColor = avatarColor;

  protected toggleHasTribe(): void {
    this.hasTribe.update((v) => !v);
  }
}
