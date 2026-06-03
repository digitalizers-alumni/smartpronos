import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import {
  PredictionFormValue,
  PredictionFormTeam,
} from '../../shared/models/prediction.models';

const MAX_SCORE = 20;
const MIN_SCORE = 0;

function integerValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return Number.isInteger(Number(value)) ? null : { integer: true };
  };
}

@Component({
  selector: 'app-prediction-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './prediction-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionForm {
  @ViewChild('homeScoreInput')
  private homeScoreInput?: ElementRef<HTMLInputElement>;

  readonly homeTeam = input.required<PredictionFormTeam>();
  readonly awayTeam = input.required<PredictionFormTeam>();
  readonly submitting = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly submitLabel = input<string>('Valider mon pronostic');
  readonly initialValues = input<PredictionFormValue | null>(null);
  readonly formKey = input<string | null>(null);

  readonly predictionSubmit = output<PredictionFormValue>();

  constructor() {
    effect(() => {
      this.formKey();
      const vals = this.initialValues();
      this.form.reset(vals ?? { homeScore: 0, awayScore: 0 });
      this.selectHomeScoreInput();
    });
  }

  protected readonly minScore = MIN_SCORE;
  protected readonly maxScore = MAX_SCORE;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    homeScore: [
      0,
      [
        Validators.required,
        Validators.min(MIN_SCORE),
        Validators.max(MAX_SCORE),
        integerValidator(),
      ],
    ],
    awayScore: [
      0,
      [
        Validators.required,
        Validators.min(MIN_SCORE),
        Validators.max(MAX_SCORE),
        integerValidator(),
      ],
    ],
  });

  protected onSubmit(): void {
    if (this.submitting() || this.disabled()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { homeScore, awayScore } = this.form.getRawValue();
    this.predictionSubmit.emit({
      homeScore: Math.trunc(homeScore),
      awayScore: Math.trunc(awayScore),
    });
  }

  protected increment(field: 'homeScore' | 'awayScore'): void {
    const control = this.form.controls[field];
    const next = Math.min((Number(control.value) || 0) + 1, MAX_SCORE);
    control.setValue(next);
    control.markAsDirty();
    control.markAsTouched();
  }

  protected decrement(field: 'homeScore' | 'awayScore'): void {
    const control = this.form.controls[field];
    const next = Math.max((Number(control.value) || 0) - 1, MIN_SCORE);
    control.setValue(next);
    control.markAsDirty();
    control.markAsTouched();
  }

  protected errorMessage(field: 'homeScore' | 'awayScore'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Score requis';
    }
    if (control.hasError('min')) {
      return `Minimum ${MIN_SCORE}`;
    }
    if (control.hasError('max')) {
      return `Maximum ${MAX_SCORE}`;
    }
    if (control.hasError('integer')) {
      return 'Nombre entier uniquement';
    }
    return 'Score invalide';
  }

  protected selectInputContent(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    window.setTimeout(() => input?.select());
  }

  reset(values?: PredictionFormValue): void {
    this.form.reset(values ?? { homeScore: 0, awayScore: 0 });
    this.selectHomeScoreInput();
  }

  private selectHomeScoreInput(): void {
    window.setTimeout(() => {
      const input = this.homeScoreInput?.nativeElement;
      input?.focus();
      input?.select();
    });
  }
}
