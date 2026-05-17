import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { PredictionForm } from '../../../components/prediction-form/prediction-form';
import {
  PredictionFormValue,
  PredictionFormTeam,
} from '../../../shared/models/prediction.models';
import { PredictionService } from '../../../services/prediction.service';
import {
  PredictionResponse,
  PredictionSubmissionError,
} from '../../../shared/models/prediction.models';

interface MatchInfo {
  id: string;
  competition: string;
  stage: string;
  kickoff: Date;
  venue: string;
  homeTeam: PredictionFormTeam;
  awayTeam: PredictionFormTeam;
}

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

const DEMO_MATCH: MatchInfo = {
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

@Component({
  selector: 'app-prediction-form-page',
  standalone: true,
  imports: [PredictionForm, RouterLink, DatePipe],
  templateUrl: './prediction-form-page.html',
  styleUrl: './prediction-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionFormPage {
  private readonly predictionService = inject(PredictionService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild(PredictionForm)
  private predictionFormRef?: PredictionForm;

  protected readonly status = signal<SubmissionStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastPrediction = signal<PredictionResponse | null>(null);
  protected readonly submittedScore = signal<PredictionFormValue | null>(null);

  private readonly matchIdParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('matchId'))),
    { initialValue: null },
  );

  protected readonly match = computed<MatchInfo>(() => {
    const id = this.matchIdParam();
    return id ? { ...DEMO_MATCH, id } : DEMO_MATCH;
  });

  protected readonly isSubmitting = computed(() => this.status() === 'submitting');
  protected readonly isSuccess = computed(() => this.status() === 'success');
  protected readonly isError = computed(() => this.status() === 'error');

  protected handlePredictionSubmit(value: PredictionFormValue): void {
    if (this.isSubmitting()) {
      return;
    }
    this.status.set('submitting');
    this.errorMessage.set(null);

    const payload = {
      matchId: this.match().id,
      homeScore: value.homeScore,
      awayScore: value.awayScore,
    };

    this.predictionService.submitPrediction(payload).subscribe({
      next: (response) => {
        this.lastPrediction.set(response);
        this.submittedScore.set(value);
        this.status.set('success');
      },
      error: (error: unknown) => {
        const message =
          error instanceof PredictionSubmissionError
            ? error.message
            : "Une erreur est survenue. Veuillez réessayer.";
        this.errorMessage.set(message);
        this.submittedScore.set(value);
        this.status.set('error');
      },
    });
  }

  protected predictAgain(): void {
    this.status.set('idle');
    this.errorMessage.set(null);
    this.lastPrediction.set(null);
    this.submittedScore.set(null);
    this.predictionFormRef?.reset();
  }

  protected dismissError(): void {
    if (this.isError()) {
      this.status.set('idle');
      this.errorMessage.set(null);
    }
  }
}
