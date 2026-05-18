export interface PredictionFormValue {
  homeScore: number;
  awayScore: number;
}

export interface PredictionFormTeam {
  name: string;
  shortCode?: string;
  flagUrl?: string;
  accentColor?: string;
}

export interface PredictionPayload {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export interface PredictionResponse {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  submittedAt: string;
  pointsAwarded?: number;
}

export class PredictionSubmissionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'PredictionSubmissionError';
  }
}
