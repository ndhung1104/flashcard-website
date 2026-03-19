import { requireAuth } from '../../../server/auth.js';
import {
  getQueryParam,
  methodNotAllowed,
  parseJsonBody,
  sendJson,
} from '../../../server/http.js';
import { createUserClient } from '../../../server/supabase.js';
import { applyStudyRecallResult } from '../../../server/mastery.js';
import { getCardById, setCardMastery } from '../../../server/repositories/cards.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') {
    methodNotAllowed(res, ['PATCH']);
    return;
  }

  const cardId = getQueryParam(req, 'cardId');
  if (!cardId) {
    sendJson(res, 400, { error: 'cardId is required', code: 'CARD_ID_REQUIRED' });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const action = typeof body.action === 'string' ? body.action : '';

    if (action !== 'relearn' && action !== 'known') {
      sendJson(res, 400, {
        error: "action must be 'relearn' or 'known'",
        code: 'CARD_MASTERY_ACTION_INVALID',
      });
      return;
    }

    const supabase = createUserClient(auth.accessToken);
    const card = await getCardById(supabase, auth.userId, cardId);

    if (!card) {
      sendJson(res, 404, { error: 'Card not found', code: 'CARD_NOT_FOUND' });
      return;
    }

    const transition = applyStudyRecallResult(card.mastery_level, action);

    await setCardMastery(
      supabase,
      auth.userId,
      cardId,
      transition.masteryLevel,
      transition.lastReviewedAt,
      transition.nextReviewAt
    );

    sendJson(res, 200, {
      success: true,
      cardId,
      masteryLevel: transition.masteryLevel,
      lastReviewedAt: transition.lastReviewedAt,
      nextReviewAt: transition.nextReviewAt,
      code: 'CARD_MASTERY_UPDATED',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update card mastery';

    sendJson(res, 500, {
      error: message,
      code: 'CARD_MASTERY_UPDATE_FAILED',
    });
  }
}
