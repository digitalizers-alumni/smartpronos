export type MatchStatus = 'scheduled' | 'locked' | 'finished';

export interface MatchTeam {
  name: string;
  shortCode: string;
  flagUrl?: string;
}

export interface MatchPredictionSummary {
  homeScore: number | null;
  awayScore: number | null;
  hasPrediction: boolean;
  isBoosted: boolean;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface MatchListItem {
  id: string;
  fifaMatchNumber?: number;
  kickoff: string;
  competition?: string;
  stage?: string;
  group?: string;
  venue?: string;
  venueCity?: string;
  venueStadium?: string;
  venueCountry?: string;
  localKickoffTime?: string;
  localTimezone?: string;
  status: MatchStatus;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  prediction: MatchPredictionSummary;
  result?: MatchResult;
  pointsEarned?: number;
}
