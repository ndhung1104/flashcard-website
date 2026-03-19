import { requireAuth } from '../../server/auth.js';
import { mapDeckRows, mapSingleDeck } from '../../server/decks.js';
import { methodNotAllowed, parseJsonBody, sendJson } from '../../server/http.js';
import { createUserClient } from '../../server/supabase.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    methodNotAllowed(res, ['GET', 'POST']);
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
      const { data: deckRows, error: deckError } = await supabase
        .from('decks')
        .select('id, title, description, created_at')
        .order('created_at', { ascending: false });

      if (deckError) {
        sendJson(res, 500, { error: deckError.message });
        return;
      }

      const deckIds = (deckRows ?? []).map((deck: any) => String(deck.id));
      let cardRows: any[] = [];

      if (deckIds.length > 0) {
        const { data: cards, error: cardError } = await supabase
          .from('cards')
          .select(
            'id, deck_id, term, meaning, tags, is_unfamiliar, mastery_level, last_reviewed_at, next_review_at, created_at'
          )
          .in('deck_id', deckIds)
          .order('created_at', { ascending: true });

        if (cardError) {
          sendJson(res, 500, { error: cardError.message });
          return;
        }

        cardRows = cards ?? [];
      }

      sendJson(res, 200, {
        decks: mapDeckRows(deckRows ?? [], cardRows),
      });
      return;
    }

    const body = await parseJsonBody(req);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';

    if (!title) {
      sendJson(res, 400, { error: 'Deck title is required' });
      return;
    }

    const { data: deckRow, error: createError } = await supabase
      .from('decks')
      .insert({
        title,
        description,
        user_id: auth.userId,
      })
      .select('id, title, description, created_at')
      .single();

    if (createError || !deckRow) {
      sendJson(res, 500, { error: createError?.message ?? 'Failed to create deck' });
      return;
    }

    sendJson(res, 201, {
      deck: mapSingleDeck(deckRow, []),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to handle decks request';
    sendJson(res, 500, { error: message });
  }
}

