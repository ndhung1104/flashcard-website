import { requireAuth } from '../../server/auth.js';
import { mapSingleDeck } from '../../server/decks.js';
import {
  getQueryParam,
  methodNotAllowed,
  parseJsonBody,
  sendJson,
} from '../../server/http.js';
import { createUserClient } from '../../server/supabase.js';

function normalizeCardInput(input: unknown) {
  const card = input && typeof input === 'object' ? (input as any) : {};

  const term = typeof card.term === 'string' ? card.term.trim() : '';
  const meaning = typeof card.meaning === 'string' ? card.meaning.trim() : '';

  if (!term || !meaning) {
    return null;
  }

  return {
    id:
      typeof card.id === 'string' && card.id.trim() !== ''
        ? card.id.trim()
        : undefined,
    term,
    meaning,
    tags: Array.isArray(card.tags)
      ? card.tags
          .map((tag: unknown) => String(tag).trim())
          .filter(Boolean)
      : [],
    is_unfamiliar: Boolean(card.isUnfamiliar),
  };
}

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
    .select('id, deck_id, term, meaning, tags, is_unfamiliar, created_at')
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

    if (Array.isArray(body.cards)) {
      const { error: deleteCardsError } = await supabase
        .from('cards')
        .delete()
        .eq('deck_id', deckId)
        .eq('user_id', auth.userId);

      if (deleteCardsError) {
        sendJson(res, 500, { error: deleteCardsError.message });
        return;
      }

      const cardsToInsert = body.cards
        .map((card: unknown) => normalizeCardInput(card))
        .filter(Boolean)
        .map((card: any) => ({
          ...card,
          user_id: auth.userId,
          deck_id: deckId,
        }));

      if (cardsToInsert.length > 0) {
        const { error: insertCardsError } = await supabase
          .from('cards')
          .insert(cardsToInsert);

        if (insertCardsError) {
          sendJson(res, 500, { error: insertCardsError.message });
          return;
        }
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

