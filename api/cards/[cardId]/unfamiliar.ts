import { requireAuth } from '../../../server/auth.js';
import {
  getQueryParam,
  methodNotAllowed,
  parseJsonBody,
  sendJson,
} from '../../../server/http.js';
import { createUserClient } from '../../../server/supabase.js';
import { setCardUnfamiliar } from '../../../server/repositories/cards.js';

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
    if (typeof body.isUnfamiliar !== 'boolean') {
      sendJson(res, 400, {
        error: 'isUnfamiliar boolean is required',
        code: 'CARD_UNFAMILIAR_VALIDATION_ERROR',
      });
      return;
    }

    const supabase = createUserClient(auth.accessToken);
    await setCardUnfamiliar(supabase, auth.userId, cardId, body.isUnfamiliar);

    sendJson(res, 200, {
      success: true,
      cardId,
      isUnfamiliar: body.isUnfamiliar,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update unfamiliar status';

    sendJson(res, 500, {
      error: message,
      code: 'CARD_UNFAMILIAR_UPDATE_FAILED',
    });
  }
}
