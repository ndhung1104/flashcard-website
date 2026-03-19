import {
  applyQuizResult,
  applyStudyRecallResult,
  clampMasteryLevel,
} from '../mastery';

describe('mastery transitions', () => {
  const now = new Date('2026-03-19T10:00:00.000Z');

  it('clamps mastery level to range 0..3', () => {
    expect(clampMasteryLevel(-10)).toBe(0);
    expect(clampMasteryLevel(0)).toBe(0);
    expect(clampMasteryLevel(1.9)).toBe(1);
    expect(clampMasteryLevel(2)).toBe(2);
    expect(clampMasteryLevel(3)).toBe(3);
    expect(clampMasteryLevel(99)).toBe(3);
  });

  it('study relearn forces level 1', () => {
    const result = applyStudyRecallResult(3, 'relearn', now);

    expect(result).toEqual({
      masteryLevel: 1,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: null,
    });
  });

  it('study known forces level 3 and schedules next review', () => {
    const result = applyStudyRecallResult(0, 'known', now);

    expect(result).toEqual({
      masteryLevel: 3,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: '2026-03-22T10:00:00.000Z',
    });
  });

  it('quiz correct increases level by 1 up to max 3', () => {
    expect(applyQuizResult(0, true, now).masteryLevel).toBe(1);
    expect(applyQuizResult(1, true, now).masteryLevel).toBe(2);
    expect(applyQuizResult(2, true, now).masteryLevel).toBe(3);
    expect(applyQuizResult(3, true, now).masteryLevel).toBe(3);
  });

  it('quiz wrong applies penalty and resets to level 1', () => {
    const result = applyQuizResult(3, false, now);

    expect(result).toEqual({
      masteryLevel: 1,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: null,
    });
  });
});
