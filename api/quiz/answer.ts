import { requireAuth } from '../../server/auth.js';
import { methodNotAllowed, parseJsonBody, sendJson } from '../../server/http.js';
import { applyQuizResult } from '../../server/mastery.js';
import { getCardById, setCardMastery } from '../../server/repositories/cards.js';
import { createUserClient } from '../../server/supabase.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const deckId = typeof body.deckId === 'string' ? body.deckId.trim() : '';
    const cardId = typeof body.cardId === 'string' ? body.cardId.trim() : '';
    const selectedMeaning =
      typeof body.selectedMeaning === 'string' ? body.selectedMeaning.trim() : '';

    if (!deckId || !cardId || !selectedMeaning) {
      sendJson(res, 400, {
        error: 'deckId, cardId and selectedMeaning are required',
        code: 'QUIZ_ANSWER_VALIDATION_ERROR',
      });
      return;
    }

    const supabase = createUserClient(auth.accessToken);
    const card = await getCardById(supabase, auth.userId, cardId);

    if (!card || card.deck_id !== deckId) {
      sendJson(res, 404, {
        error: 'Card not found in this deck',
        code: 'QUIZ_ANSWER_CARD_NOT_FOUND',
      });
      return;
    }

    const isCorrect = selectedMeaning === card.meaning;
    const transition = applyQuizResult(card.mastery_level, isCorrect);

    await setCardMastery(
      supabase,
      auth.userId,
      card.id,
      transition.masteryLevel,
      transition.lastReviewedAt,
      transition.nextReviewAt
    );

    sendJson(res, 200, {
      cardId: card.id,
      isCorrect,
      correctMeaning: card.meaning,
      masteryLevel: transition.masteryLevel,
      lastReviewedAt: transition.lastReviewedAt,
      nextReviewAt: transition.nextReviewAt,
      code: 'QUIZ_ANSWER_RECORDED',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record quiz answer';

    sendJson(res, 500, {
      error: message,
      code: 'QUIZ_ANSWER_FAILED',
    });
  }
}
