import { MasteryLevel, clampMasteryLevel } from './mastery.js';

export interface LearnCard {
  id: string;
  masteryLevel: number;
}

export interface BuildLearnQueueOptions {
  includeMastered?: boolean;
  maxCards?: number;
  rng?: () => number;
}

const DEFAULT_WEIGHTS: Record<MasteryLevel, number> = {
  0: 0.15,
  1: 0.5,
  2: 0.35,
  3: 0,
};

const WEIGHTS_WITH_MASTERED: Record<MasteryLevel, number> = {
  ...DEFAULT_WEIGHTS,
  3: 0.1,
};

function pickLevel(
  availableLevels: MasteryLevel[],
  weights: Record<MasteryLevel, number>,
  rng: () => number
): MasteryLevel {
  const totalWeight = availableLevels.reduce(
    (sum, level) => sum + weights[level],
    0
  );

  if (totalWeight <= 0) {
    const randomIndex = Math.floor(rng() * availableLevels.length);
    return availableLevels[randomIndex] ?? availableLevels[0];
  }

  const threshold = rng() * totalWeight;
  let cumulative = 0;

  for (const level of availableLevels) {
    cumulative += weights[level];
    if (threshold <= cumulative) {
      return level;
    }
  }

  return availableLevels[availableLevels.length - 1];
}

export function buildLearnQueue(
  cards: LearnCard[],
  options: BuildLearnQueueOptions = {}
): string[] {
  const includeMastered = options.includeMastered ?? false;
  const rng = options.rng ?? Math.random;
  const maxCards = options.maxCards ?? cards.length;

  const weights = includeMastered ? WEIGHTS_WITH_MASTERED : DEFAULT_WEIGHTS;

  const groups = new Map<MasteryLevel, LearnCard[]>();
  for (const level of [0, 1, 2, 3] as MasteryLevel[]) {
    groups.set(level, []);
  }

  for (const card of cards) {
    const level = clampMasteryLevel(card.masteryLevel);

    if (!includeMastered && level === 3) {
      continue;
    }

    const bucket = groups.get(level);
    if (!bucket) {
      continue;
    }
    bucket.push(card);
  }

  const queue: string[] = [];

  while (queue.length < maxCards) {
    const availableLevels = ([1, 2, 0, 3] as MasteryLevel[]).filter(
      (level) => (groups.get(level)?.length ?? 0) > 0
    );

    if (availableLevels.length === 0) {
      break;
    }

    const selectedLevel = pickLevel(availableLevels, weights, rng);
    const bucket = groups.get(selectedLevel) ?? [];

    const selectedIndex = Math.floor(rng() * bucket.length);
    const [selectedCard] = bucket.splice(selectedIndex, 1);

    if (selectedCard) {
      queue.push(selectedCard.id);
    }
  }

  return queue;
}
