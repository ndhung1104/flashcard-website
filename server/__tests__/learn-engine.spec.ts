import { buildLearnQueue } from '../learn-engine';

describe('learn engine queue', () => {
  const cards = [
    { id: 'l0-a', masteryLevel: 0 },
    { id: 'l0-b', masteryLevel: 0 },
    { id: 'l1-a', masteryLevel: 1 },
    { id: 'l1-b', masteryLevel: 1 },
    { id: 'l2-a', masteryLevel: 2 },
    { id: 'l3-a', masteryLevel: 3 },
  ];

  it('excludes level 3 cards by default', () => {
    const queue = buildLearnQueue(cards, { rng: () => 0 });

    expect(queue).toEqual(['l1-a', 'l1-b', 'l2-a', 'l0-a', 'l0-b']);
    expect(queue.includes('l3-a')).toBe(false);
  });

  it('includes level 3 cards when includeMastered=true', () => {
    const queue = buildLearnQueue(cards, {
      includeMastered: true,
      rng: () => 0.999,
    });

    expect(queue.includes('l3-a')).toBe(true);
  });

  it('respects maxCards limit', () => {
    const queue = buildLearnQueue(cards, { rng: () => 0, maxCards: 3 });

    expect(queue).toEqual(['l1-a', 'l1-b', 'l2-a']);
  });

  it('prioritizes level 1 and 2 before level 0 with deterministic rng', () => {
    const queue = buildLearnQueue(cards, { rng: () => 0 });

    const firstLevel0Index = queue.findIndex((id) => id.startsWith('l0-'));
    const firstLevel2Index = queue.findIndex((id) => id === 'l2-a');

    expect(firstLevel2Index).toBeLessThan(firstLevel0Index);
  });
});
