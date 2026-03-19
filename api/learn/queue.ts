import { requireAuth } from '../../server/auth.js';
import { getQueryParam, methodNotAllowed, sendJson } from '../../server/http.js';
import { buildLearnQueue } from '../../server/learn-engine.js';
import { listCardsByDeck } from '../../server/repositories/cards.js';
import { createUserClient } from '../../server/supabase.js';

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
      code: 'LEARN_DECK_ID_REQUIRED',
    });
    return;
  }

  const includeMastered =
    getQueryParam(req, 'includeMastered')?.toLowerCase() === 'true';

  try {
    const supabase = createUserClient(auth.accessToken);
    const cards = await listCardsByDeck(supabase, auth.userId, deckId);

    const queue = buildLearnQueue(
      cards.map((card) => ({
        id: card.id,
        masteryLevel: card.mastery_level,
      })),
      { includeMastered }
    );

    sendJson(res, 200, {
      deckId,
      includeMastered,
      queue,
      total: queue.length,
      code: 'LEARN_QUEUE_READY',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to build learn queue';

    sendJson(res, 500, {
      error: message,
      code: 'LEARN_QUEUE_FAILED',
    });
  }
}
