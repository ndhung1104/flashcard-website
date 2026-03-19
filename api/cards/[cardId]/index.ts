import { requireAuth } from '../../../server/auth.js';
import { getQueryParam, methodNotAllowed, sendJson } from '../../../server/http.js';
import { createUserClient } from '../../../server/supabase.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    methodNotAllowed(res, ['DELETE']);
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

  const supabase = createUserClient(auth.accessToken);

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
    .eq('user_id', auth.userId);

  if (error) {
    sendJson(res, 500, { error: error.message, code: 'CARD_DELETE_FAILED' });
    return;
  }

  sendJson(res, 200, { success: true, cardId });
}
