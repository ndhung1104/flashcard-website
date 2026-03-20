import {
  applyQuizResult,
  applyStudyRecallResult,
  clampMasteryLevel,
} from '../mastery';

describe('mastery transitions', () => {
  const now = new Date('2026-03-19T10:00:00.000Z');

  it('normalizes mastery level with floor at 0 and no max cap', () => {
    expect(clampMasteryLevel(-10)).toBe(0);
    expect(clampMasteryLevel(0)).toBe(0);
    expect(clampMasteryLevel(1.9)).toBe(1);
    expect(clampMasteryLevel(2)).toBe(2);
    expect(clampMasteryLevel(3)).toBe(3);
    expect(clampMasteryLevel(99)).toBe(99);
  });

  it('study relearn forces level 1', () => {
    const result = applyStudyRecallResult(3, 'relearn', now);

    expect(result).toEqual({
      masteryLevel: 1,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: null,
    });
  });

  it('study known increases level by 1 with floor at 2', () => {
    const fromLevel0 = applyStudyRecallResult(0, 'known', now);
    const fromLevel1 = applyStudyRecallResult(1, 'known', now);

    expect(fromLevel0).toEqual({
      masteryLevel: 2,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: null,
    });
    expect(fromLevel1).toEqual({
      masteryLevel: 2,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: null,
    });
  });

  it('study known reaches level 3 when starting from level 2', () => {
    const fromLevel2 = applyStudyRecallResult(2, 'known', now);

    expect(fromLevel2).toEqual({
      masteryLevel: 3,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: '2026-03-22T10:00:00.000Z',
    });
  });

  it('study known does not clamp at 3 and keeps increasing', () => {
    const fromLevel3 = applyStudyRecallResult(3, 'known', now);
    const fromLevel10 = applyStudyRecallResult(10, 'known', now);

    expect(fromLevel3).toEqual({
      masteryLevel: 4,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: '2026-03-22T10:00:00.000Z',
    });
    expect(fromLevel10).toEqual({
      masteryLevel: 11,
      lastReviewedAt: '2026-03-19T10:00:00.000Z',
      nextReviewAt: '2026-03-22T10:00:00.000Z',
    });
  });

  it('quiz correct increases level by 1 without max cap', () => {
    expect(applyQuizResult(0, true, now).masteryLevel).toBe(1);
    expect(applyQuizResult(1, true, now).masteryLevel).toBe(2);
    expect(applyQuizResult(2, true, now).masteryLevel).toBe(3);
    expect(applyQuizResult(3, true, now).masteryLevel).toBe(4);
    expect(applyQuizResult(10, true, now).masteryLevel).toBe(11);
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
