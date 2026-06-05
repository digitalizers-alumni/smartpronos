import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap, catchError, of } from 'rxjs';

import { PredictionForm } from '../../components/prediction-form/prediction-form';
import {
  PredictionFormValue,
  PredictionFormTeam,
} from '../../shared/models/prediction.models';
import { PredictionService } from '../../services/prediction.service';
import {
  PredictionResponse,
  PredictionSubmissionError,
} from '../../shared/models/prediction.models';
import { MatchService } from '../../services/match.service';
import { MatchListItem } from '../../shared/models/match.models';
import { TeamService } from '../../services/team.service';
import { stageLabel } from '../../shared/utils/stage-label';
import { PredictionProgressService } from '../../services/prediction-progress.service';

type SubmissionStatus = 'idle' | 'submitting' | 'error';

@Component({
  selector: 'app-prediction-form-page',
  standalone: true,
  imports: [PredictionForm, DatePipe, RouterLink],
  templateUrl: './prediction-form-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionFormPage {
  private readonly predictionService = inject(PredictionService);
  private readonly matchService = inject(MatchService);
  private readonly teamService = inject(TeamService);
  private readonly predictionProgressService = inject(PredictionProgressService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private successBannerTimeout: ReturnType<typeof window.setTimeout> | null = null;
  private completionRedirectTimeout: ReturnType<typeof window.setTimeout> | null = null;

  @ViewChild(PredictionForm)
  private predictionFormRef?: PredictionForm;

  protected readonly status = signal<SubmissionStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly lastPrediction = signal<PredictionResponse | null>(null);
  protected readonly submittedScore = signal<PredictionFormValue | null>(null);
  protected readonly loading = signal(true);
  protected readonly match = signal<MatchListItem | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly boostsAvailable = signal<number | null>(null);
  protected readonly boostsError = signal<string | null>(null);
  protected readonly boostSelected = signal(false);
  protected readonly successBanner = signal<string | null>(null);
  protected readonly noNextPrediction = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('matchId')),
        switchMap((id) => {
          this.loading.set(true);
          this.loadError.set(null);
          this.status.set('idle');
          this.errorMessage.set(null);
          this.lastPrediction.set(null);
          this.submittedScore.set(null);
          this.noNextPrediction.set(false);
          if (!id) {
            this.loadError.set('Match introuvable.');
            return of(null);
          }
          return this.matchService.getMatchById(id).pipe(
            catchError((err) => {
              console.error('[PredictionFormPage] Impossible de charger le match.', err);
              this.loadError.set('Impossible de charger ce match depuis la base locale.');
              return of(null);
            }),
          );
        }),
      )
      .subscribe((m) => {
        this.match.set(m);
        this.boostSelected.set(m?.prediction.isBoosted ?? false);
        if (!m && !this.loadError()) {
          this.loadError.set('Match introuvable.');
        }
        this.loading.set(false);
      });

    this.loadBoosts();
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('saved') === '1') {
        this.showSuccessBanner('Pronostic validé.');
      }
    });
  }

  protected readonly homeTeam = computed<PredictionFormTeam>(() => {
    const m = this.match();
    if (!m) return { name: '—', shortCode: '' };
    return {
      name: m.homeTeam.name,
      shortCode: m.homeTeam.shortCode,
      flagUrl: m.homeTeam.flagUrl,
    };
  });

  protected readonly awayTeam = computed<PredictionFormTeam>(() => {
    const m = this.match();
    if (!m) return { name: '—', shortCode: '' };
    return {
      name: m.awayTeam.name,
      shortCode: m.awayTeam.shortCode,
      flagUrl: m.awayTeam.flagUrl,
    };
  });

  protected readonly existingPrediction = computed<PredictionFormValue | null>(() => {
    const m = this.match();
    if (!m?.prediction.hasPrediction) return null;
    return {
      homeScore: m.prediction.homeScore ?? 0,
      awayScore: m.prediction.awayScore ?? 0,
    };
  });

  protected readonly isEdit = computed(() => this.existingPrediction() !== null);
  protected readonly isSubmitting = computed(() => this.status() === 'submitting');
  protected readonly isError = computed(() => this.status() === 'error');
  protected readonly isFinished = computed(() => this.match()?.status === 'finished');
  protected readonly isScheduled = computed(() => this.match()?.status === 'scheduled');
  protected readonly result = computed(() => this.match()?.result ?? null);
  protected readonly hasPrediction = computed(() => this.match()?.prediction.hasPrediction ?? false);
  protected readonly stageLabel = computed(() => stageLabel(this.match()?.stage));

  protected readonly isLocked = computed(() => {
    const m = this.match();
    if (!m) return false;
    if (m.status === 'locked') return true;
    if (m.status === 'finished') return true;
    const deadline = new Date(m.kickoff).getTime() - 15 * 60 * 1000;
    return Date.now() >= deadline;
  });

  protected readonly disabled = computed(() => this.isLocked() || this.isSubmitting());
  protected readonly canToggleBoost = computed(() => {
    if (this.disabled()) return false;
    if (this.boostSelected()) return true;
    return (this.boostsAvailable() ?? 0) > 0;
  });
  protected readonly boostsAvailableLabel = computed(() => {
    const count = this.boostsAvailable();
    if (count === null) return 'Quota de boosts indisponible.';
    return `${count} boost${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}.`;
  });

  protected readonly submitLabel = computed(() => {
    if (this.isEdit()) return 'Modifier mon pronostic';
    return 'Valider mon pronostic';
  });

  protected readonly successMessage = computed(() => {
    if (this.isEdit()) return 'Pronostic modifié !';
    return 'Pronostic enregistré !';
  });

  protected handlePredictionSubmit(value: PredictionFormValue): void {
    if (this.isSubmitting()) return;
    this.status.set('submitting');
    this.errorMessage.set(null);

    const payload = {
      matchId: this.match()?.id ?? '',
      homeScore: value.homeScore,
      awayScore: value.awayScore,
      isBoosted: this.boostSelected(),
    };

    this.predictionService.submitPrediction(payload).subscribe({
      next: (response) => {
        this.lastPrediction.set(response);
        this.submittedScore.set(value);
        this.boostsAvailable.set(response.boostsAvailable);
        this.status.set('idle');
        this.predictionProgressService.refresh();
        this.showSuccessBanner(this.successMessage());
        this.navigateToNextPrediction(response.matchId);
      },
      error: (error: unknown) => {
        const message =
          error instanceof PredictionSubmissionError
            ? error.message
            : 'Une erreur est survenue. Veuillez réessayer.';
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

  protected toggleBoost(): void {
    if (!this.canToggleBoost()) return;
    this.boostSelected.update((value) => !value);
  }

  protected goToMatchList(): void {
    this.router.navigate(['/home', 'match-list']);
  }

  protected dismissError(): void {
    if (this.isError()) {
      this.status.set('idle');
      this.errorMessage.set(null);
    }
  }

  private loadBoosts(): void {
    this.boostsError.set(null);
    this.teamService.getUserProfile().subscribe({
      next: (profile) => {
        this.boostsAvailable.set(profile.boosts_available);
      },
      error: (err) => {
        console.error('[PredictionFormPage] Impossible de charger le quota de boosts.', err);
        this.boostsAvailable.set(null);
        this.boostsError.set('Boosts indisponibles pour le moment.');
      },
    });
  }

  private showSuccessBanner(message: string): void {
    if (this.successBannerTimeout) {
      window.clearTimeout(this.successBannerTimeout);
    }
    this.successBanner.set(message);
    this.successBannerTimeout = window.setTimeout(() => {
      this.successBanner.set(null);
      this.successBannerTimeout = null;
    }, 2500);
  }

  private navigateToNextPrediction(currentMatchId: string): void {
    this.matchService.getMatches().subscribe({
      next: (matches) => {
        const currentKickoff = new Date(this.match()?.kickoff ?? 0).getTime();
        const candidates = matches
          .filter((match) =>
            match.id !== currentMatchId &&
            match.status === 'scheduled' &&
            !match.prediction.hasPrediction
          )
          .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
        const nextMatch =
          candidates.find((match) => new Date(match.kickoff).getTime() > currentKickoff) ??
          candidates[0] ??
          null;

        if (!nextMatch) {
          this.showCompletionBannerAndRedirect();
          return;
        }

        this.router.navigate(
          ['/match', nextMatch.id, 'prediction-form'],
          { queryParams: { saved: '1' } },
        );
      },
      error: (err) => {
        console.error('[PredictionFormPage] Impossible de trouver le prochain prono.', err);
        this.noNextPrediction.set(true);
      },
    });
  }

  private showCompletionBannerAndRedirect(): void {
    if (this.completionRedirectTimeout) {
      window.clearTimeout(this.completionRedirectTimeout);
    }
    this.noNextPrediction.set(false);
    this.showSuccessBanner('100% des pronos disponibles complétés. Félicitations !');
    this.completionRedirectTimeout = window.setTimeout(() => {
      this.completionRedirectTimeout = null;
      this.router.navigate(['/home', 'match-list']);
    }, 2200);
  }
}
