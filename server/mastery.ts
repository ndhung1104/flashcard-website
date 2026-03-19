export type MasteryLevel = 0 | 1 | 2 | 3;

export interface MasteryTransitionResult {
  masteryLevel: MasteryLevel;
  lastReviewedAt: string;
  nextReviewAt: string | null;
}

const MASTERED_REVIEW_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

export function clampMasteryLevel(input: number): MasteryLevel {
  if (input <= 0) return 0;
  if (input >= 3) return 3;
  return Math.trunc(input) as 1 | 2;
}

function toIsoString(value: Date): string {
  return value.toISOString();
}

function computeNextReviewAt(level: MasteryLevel, now: Date): string | null {
  if (level !== 3) {
    return null;
  }

  return new Date(now.getTime() + MASTERED_REVIEW_DELAY_MS).toISOString();
}

export function applyStudyRecallResult(
  currentLevel: number,
  action: 'relearn' | 'known',
  now: Date = new Date()
): MasteryTransitionResult {
  const _current = clampMasteryLevel(currentLevel);
  const nextLevel: MasteryLevel = action === 'known' ? 3 : 1;

  return {
    masteryLevel: nextLevel,
    lastReviewedAt: toIsoString(now),
    nextReviewAt: computeNextReviewAt(nextLevel, now),
  };
}

export function applyQuizResult(
  currentLevel: number,
  isCorrect: boolean,
  now: Date = new Date()
): MasteryTransitionResult {
  const normalizedCurrent = clampMasteryLevel(currentLevel);

  const nextLevel: MasteryLevel = isCorrect
    ? clampMasteryLevel(normalizedCurrent + 1)
    : 1;

  return {
    masteryLevel: nextLevel,
    lastReviewedAt: toIsoString(now),
    nextReviewAt: computeNextReviewAt(nextLevel, now),
  };
}
