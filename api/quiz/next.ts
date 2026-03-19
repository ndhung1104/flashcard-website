import { requireAuth } from '../../server/auth.js';
import { getQueryParam, methodNotAllowed, sendJson } from '../../server/http.js';
import { buildLearnQueue } from '../../server/learn-engine.js';
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

  const includeMastered =
    getQueryParam(req, 'includeMastered')?.toLowerCase() === 'true';

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

    const queue = buildLearnQueue(
      cards.map((card) => ({
        id: card.id,
        masteryLevel: card.mastery_level,
      })),
      { includeMastered, maxCards: cards.length }
    );

    const selectedCardId = queue[0];

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
