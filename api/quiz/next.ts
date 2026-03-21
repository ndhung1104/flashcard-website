import { requireAuth } from '../../server/auth.js';
import { getQueryParam, methodNotAllowed, sendJson } from '../../server/http.js';
import { listCardsByDeck } from '../../server/repositories/cards.js';
import { createUserClient } from '../../server/supabase.js';

function shuffle<T>(items: T[]): T[] {
  const next = [...items];

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
}

interface QuizCard {
  id: string;
  mastery_level: number;
}

const BUCKET_WEIGHTS = {
  0: 0.15,
  1: 0.5,
  2: 0.35,
  3: 0.1,
};

function takeFromBucket(bucket: QuizCard[], count: number): { taken: QuizCard[]; remainingNeed: number } {
  if (count <= 0) {
    return { taken: [], remainingNeed: 0 };
  }

  const taken = bucket.splice(0, count);
  return {
    taken,
    remainingNeed: Math.max(0, count - taken.length),
  };
}

function buildQuizQueue(cards: QuizCard[]): string[] {
  const bucket0: QuizCard[] = [];
  const bucket1: QuizCard[] = [];
  const bucket2: QuizCard[] = [];
  const bucket3: QuizCard[] = [];

  for (const card of cards) {
    const mastery = Math.max(0, Math.trunc(card.mastery_level));

    if (mastery === 0) {
      bucket0.push(card);
      continue;
    }

    if (mastery === 1) {
      bucket1.push(card);
      continue;
    }

    if (mastery === 2) {
      bucket2.push(card);
      continue;
    }

    bucket3.push(card);
  }

  const totalCards = cards.length;
  const target0 = Math.round(totalCards * BUCKET_WEIGHTS[0]);
  const remainingAfter0 = Math.max(0, totalCards - target0);
  const weightSum = BUCKET_WEIGHTS[1] + BUCKET_WEIGHTS[2] + BUCKET_WEIGHTS[3];

  const target1 = Math.round(remainingAfter0 * (BUCKET_WEIGHTS[1] / weightSum));
  const target2 = Math.round(remainingAfter0 * (BUCKET_WEIGHTS[2] / weightSum));
  const target3 = Math.max(0, remainingAfter0 - target1 - target2);

  const queue: QuizCard[] = [];

  const from0 = takeFromBucket(bucket0, target0);
  queue.push(...from0.taken);

  const from1 = takeFromBucket(bucket1, target1 + from0.remainingNeed);
  queue.push(...from1.taken);

  const from2 = takeFromBucket(bucket2, target2 + from1.remainingNeed);
  queue.push(...from2.taken);

  const from3 = takeFromBucket(bucket3, target3 + from2.remainingNeed);
  queue.push(...from3.taken);

  // Safety fill for rounding/empty-bucket gaps: keep non-zero buckets ahead of extra level-0 cards.
  queue.push(...bucket1, ...bucket2, ...bucket3, ...bucket0);

  return queue.map((card) => card.id);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
    return;
  }

  const deckId = getQueryParam(req, 'deckId');
  if (!deckId) {
    sendJson(res, 400, {
      error: 'deckId is required',
      code: 'QUIZ_DECK_ID_REQUIRED',
    });
    return;
  }

  const excludeCardIds = (getQueryParam(req, 'excludeCardIds') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const excludedCardIdSet = new Set(excludeCardIds);

  try {
    const supabase = createUserClient(auth.accessToken);
    const cards = await listCardsByDeck(supabase, auth.userId, deckId);

    if (cards.length === 0) {
      sendJson(res, 200, {
        question: null,
        code: 'QUIZ_NO_CARDS',
      });
      return;
    }

    const queue = buildQuizQueue(
      cards.map((card) => ({
        id: card.id,
        mastery_level: card.mastery_level,
      }))
    );

    const selectedCardId = queue.find((cardId) => !excludedCardIdSet.has(cardId));

    if (!selectedCardId) {
      sendJson(res, 200, {
        question: null,
        code: 'QUIZ_NO_ELIGIBLE_CARDS',
      });
      return;
    }

    const selectedCard = cards.find((card) => card.id === selectedCardId);
    if (!selectedCard) {
      sendJson(res, 404, {
        error: 'Selected card not found',
        code: 'QUIZ_CARD_NOT_FOUND',
      });
      return;
    }

    const distractorMeanings = cards
      .filter((card) => card.id !== selectedCard.id)
      .map((card) => card.meaning)
      .filter((meaning, index, all) => all.indexOf(meaning) === index)
      .slice(0, 3);

    const options = shuffle([selectedCard.meaning, ...distractorMeanings]);

    sendJson(res, 200, {
      question: {
        cardId: selectedCard.id,
        term: selectedCard.term,
        options,
        deckId,
      },
      code: 'QUIZ_NEXT_READY',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate quiz question';

    sendJson(res, 500, {
      error: message,
      code: 'QUIZ_NEXT_FAILED',
    });
  }
}
