import { requireAuth } from '../../server/auth.js';
import { mapSingleDeck } from '../../server/decks.js';
import {
  getQueryParam,
  methodNotAllowed,
  parseJsonBody,
  sendJson,
} from '../../server/http.js';
import { createUserClient } from '../../server/supabase.js';

async function loadDeck(supabase: any, deckId: string, userId: string) {
  const { data: deckRow, error: deckError } = await supabase
    .from('decks')
    .select('id, title, description, created_at')
    .eq('id', deckId)
    .eq('user_id', userId)
    .maybeSingle();

  if (deckError) {
    throw new Error(deckError.message);
  }

  if (!deckRow) {
    return null;
  }

  const { data: cardRows, error: cardError } = await supabase
    .from('cards')
    .select(
      'id, deck_id, term, meaning, tags, is_unfamiliar, mastery_level, last_reviewed_at, next_review_at, created_at'
    )
    .eq('deck_id', deckId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (cardError) {
    throw new Error(cardError.message);
  }

  return mapSingleDeck(deckRow, cardRows ?? []);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
    return;
  }

  const deckId = getQueryParam(req, 'deckId');
  if (!deckId) {
    sendJson(res, 400, { error: 'Deck id is required' });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  const supabase = createUserClient(auth.accessToken);

  try {
    if (req.method === 'GET') {
      const deck = await loadDeck(supabase, deckId, auth.userId);
      if (!deck) {
        sendJson(res, 404, { error: 'Deck not found' });
        return;
      }

      sendJson(res, 200, { deck });
      return;
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId)
        .eq('user_id', auth.userId);

      if (error) {
        sendJson(res, 500, { error: error.message });
        return;
      }

      sendJson(res, 200, { success: true });
      return;
    }

    const body = await parseJsonBody(req);

    if (Array.isArray(body.cards)) {
      sendJson(res, 400, {
        error:
          'Updating cards through deck PATCH is no longer supported. Use /api/cards endpoints.',
        code: 'DECK_PATCH_CARDS_NOT_SUPPORTED',
      });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.title === 'string') {
      updates.title = body.title.trim();
    }

    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('decks')
        .update(updates)
        .eq('id', deckId)
        .eq('user_id', auth.userId);

      if (updateError) {
        sendJson(res, 500, { error: updateError.message });
        return;
      }
    }

    const deck = await loadDeck(supabase, deckId, auth.userId);
    if (!deck) {
      sendJson(res, 404, { error: 'Deck not found' });
      return;
    }

    sendJson(res, 200, { deck });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to handle deck request';
    sendJson(res, 500, { error: message });
  }
}
