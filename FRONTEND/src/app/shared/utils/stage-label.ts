const STAGE_LABELS: Record<string, string> = {
  group: 'Phase de groupes',
  round_of_32: 'Seizièmes de finale',
  round_of_16: 'Huitièmes de finale',
  quarter_final: 'Quarts de finale',
  semi_final: 'Demi-finales',
  third_place: 'Troisième place',
  final: 'Finale',
};

const STAGE_KEYWORDS: [string, string][] = [
  ['huitième', 'round_of_16'],
  ['seizième', 'round_of_32'],
  ['round_of_32', 'round_of_32'],
  ['quart', 'quarter_final'],
  ['demi', 'semi_final'],
  ['troisième', 'third_place'],
  ['final', 'final'],
  ['round_of_16', 'round_of_16'],
  ['quarter_final', 'quarter_final'],
  ['semi_final', 'semi_final'],
  ['third_place', 'third_place'],
];

export function stageLabel(stage?: string): string {
  if (!stage) return '';
  const lower = stage.toLowerCase();
  for (const [keyword, key] of STAGE_KEYWORDS) {
    if (lower.includes(keyword)) return STAGE_LABELS[key] ?? stage;
  }
  return STAGE_LABELS[stage] ?? stage;
}

export function extractRoundKey(stage?: string): string {
  if (!stage) return 'unknown';
  const lower = stage.toLowerCase();
  for (const [keyword, key] of STAGE_KEYWORDS) {
    if (lower.includes(keyword)) return key;
  }
  return 'group';
}
