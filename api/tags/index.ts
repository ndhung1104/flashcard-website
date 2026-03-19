import { requireAuth } from '../../server/auth.js';
import { methodNotAllowed, parseJsonBody, sendJson } from '../../server/http.js';
import { createUserClient } from '../../server/supabase.js';
import { getOrCreateTags, listTagsByDeck } from '../../server/repositories/tags.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    methodNotAllowed(res, ['GET', 'POST']);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_UNAUTHORIZED' });
    return;
  }

  const supabase = createUserClient(auth.accessToken);

  try {
    if (req.method === 'GET') {
      const deckId =
        typeof req.query?.deckId === 'string' ? req.query.deckId : '';

      if (!deckId) {
        sendJson(res, 400, { error: 'deckId is required', code: 'TAGS_DECK_ID_REQUIRED' });
        return;
      }

      const tags = await listTagsByDeck(supabase, auth.userId, deckId);
      sendJson(res, 200, {
        tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
      });
      return;
    }

    const body = await parseJsonBody(req);
    const deckId = typeof body.deckId === 'string' ? body.deckId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!deckId || !name) {
      sendJson(res, 400, {
        error: 'deckId and name are required',
        code: 'TAGS_VALIDATION_ERROR',
      });
      return;
    }

    const tags = await getOrCreateTags(supabase, auth.userId, deckId, [name]);
    const created = tags[0];

    sendJson(res, 201, {
      tag: {
        id: created.id,
        name: created.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to handle tags request';
    sendJson(res, 500, {
      error: message,
      code: 'TAGS_UNEXPECTED_ERROR',
    });
  }
}
