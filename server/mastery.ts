export type MasteryLevel = number;

export interface MasteryTransitionResult {
  masteryLevel: number;
  lastReviewedAt: string;
  nextReviewAt: string | null;
}

const MASTERED_REVIEW_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

export function clampMasteryLevel(input: number): MasteryLevel {
  if (!Number.isFinite(input) || input <= 0) return 0;
  return Math.trunc(input);
}

function toIsoString(value: Date): string {
  return value.toISOString();
}

function computeNextReviewAt(level: number, now: Date): string | null {
  if (level < 3) {
    return null;
  }

  return new Date(now.getTime() + MASTERED_REVIEW_DELAY_MS).toISOString();
}

export function applyStudyRecallResult(
  currentLevel: number,
  action: 'relearn' | 'known',
  now: Date = new Date()
): MasteryTransitionResult {
  const normalizedCurrent = Math.max(0, Math.trunc(currentLevel));
  const nextLevel =
    action === 'known'
      ? Math.max(2, normalizedCurrent + 1)
      : 1;

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
  const normalizedCurrent = Math.max(0, Math.trunc(currentLevel));
  const nextLevel = isCorrect
    ? normalizedCurrent + 1
    : 1;

  return {
    masteryLevel: nextLevel,
    lastReviewedAt: toIsoString(now),
    nextReviewAt: computeNextReviewAt(nextLevel, now),
  };
}
