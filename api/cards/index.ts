import { requireAuth } from '../../server/auth.js';
import { methodNotAllowed, parseJsonBody, sendJson } from '../../server/http.js';
import { createUserClient } from '../../server/supabase.js';
import {
  insertCardsIgnoreDuplicates,
  listCardsByDeck,
  type CreateCardInput,
} from '../../server/repositories/cards.js';
import { getOrCreateTags } from '../../server/repositories/tags.js';

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
      const tagId = typeof req.query?.tagId === 'string' ? req.query.tagId : '';
      const unfamiliarOnly =
        typeof req.query?.unfamiliarOnly === 'string' &&
        req.query.unfamiliarOnly.toLowerCase() === 'true';

      if (!deckId) {
        sendJson(res, 400, {
          error: 'deckId is required',
          code: 'CARDS_DECK_ID_REQUIRED',
        });
        return;
      }

      let cardRows = await listCardsByDeck(supabase, auth.userId, deckId);

      if (unfamiliarOnly) {
        cardRows = cardRows.filter((card) => card.is_unfamiliar);
      }

      const cardIds = cardRows.map((card) => card.id);
      if (cardIds.length === 0) {
        sendJson(res, 200, { cards: [] });
        return;
      }

      const { data: cardTagRows, error: cardTagsError } = await supabase
        .from('card_tags')
        .select('card_id, tag_id')
        .eq('user_id', auth.userId)
        .in('card_id', cardIds);

      if (cardTagsError) {
        sendJson(res, 500, { error: cardTagsError.message, code: 'CARDS_TAG_LINK_FETCH_FAILED' });
        return;
      }

      const tagIds = Array.from(
        new Set((cardTagRows ?? []).map((row: any) => String(row.tag_id)))
      );

      let tagRows: any[] = [];
      if (tagIds.length > 0) {
        const { data: rows, error: tagError } = await supabase
          .from('tags')
          .select('id, name')
          .eq('user_id', auth.userId)
          .eq('deck_id', deckId)
          .in('id', tagIds);

        if (tagError) {
          sendJson(res, 500, { error: tagError.message, code: 'CARDS_TAG_FETCH_FAILED' });
          return;
        }

        tagRows = rows ?? [];
      }

      const tagNameById = new Map(
        (tagRows ?? []).map((tag: any) => [String(tag.id), String(tag.name)])
      );

      const tagIdsByCardId = new Map<string, string[]>();
      for (const row of cardTagRows ?? []) {
        const cardId = String(row.card_id);
        const current = tagIdsByCardId.get(cardId) ?? [];
        current.push(String(row.tag_id));
        tagIdsByCardId.set(cardId, current);
      }

      if (tagId) {
        cardRows = cardRows.filter((card) =>
          (tagIdsByCardId.get(card.id) ?? []).includes(tagId)
        );
      }

      sendJson(res, 200, {
        cards: cardRows.map((card) => ({
          id: card.id,
          term: card.term,
          meaning: card.meaning,
          isUnfamiliar: card.is_unfamiliar,
          masteryLevel: card.mastery_level,
          lastReviewedAt: card.last_reviewed_at,
          nextReviewAt: card.next_review_at,
          tags:
            (tagIdsByCardId.get(card.id) ?? []).length > 0
              ? (tagIdsByCardId.get(card.id) ?? [])
                  .map((id) => tagNameById.get(id))
                  .filter(Boolean)
              : Array.isArray(card.tags)
              ? card.tags
              : [],
        })),
      });
      return;
    }

    const body = await parseJsonBody(req);
    const deckId = typeof body.deckId === 'string' ? body.deckId.trim() : '';
    const term = typeof body.term === 'string' ? body.term.trim() : '';
    const meaning = typeof body.meaning === 'string' ? body.meaning.trim() : '';
    const tags = Array.isArray(body.tags)
      ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
      : [];

    if (!deckId || !term || !meaning) {
      sendJson(res, 400, {
        error: 'deckId, term and meaning are required',
        code: 'CARDS_VALIDATION_ERROR',
      });
      return;
    }

    const cards = await insertCardsIgnoreDuplicates(supabase, [
      {
        userId: auth.userId,
        deckId,
        term,
        meaning,
        tags,
        isUnfamiliar: false,
      } satisfies CreateCardInput,
    ]);

    const created = cards[0];
    if (!created) {
      sendJson(res, 409, {
        error: 'Duplicate term in this deck',
        code: 'CARDS_DUPLICATE_TERM',
      });
      return;
    }

    if (tags.length > 0) {
      const ensuredTags = await getOrCreateTags(supabase, auth.userId, deckId, tags);
      const links = ensuredTags.map((tag) => ({
        card_id: created.id,
        tag_id: tag.id,
        user_id: auth.userId,
      }));

      if (links.length > 0) {
        const { error: linkError } = await supabase
          .from('card_tags')
          .upsert(links, { onConflict: 'card_id,tag_id', ignoreDuplicates: true });

        if (linkError) {
          sendJson(res, 500, {
            error: linkError.message,
            code: 'CARDS_TAG_LINK_INSERT_FAILED',
          });
          return;
        }
      }
    }

    sendJson(res, 201, {
      card: {
        id: created.id,
        term: created.term,
        meaning: created.meaning,
        isUnfamiliar: created.is_unfamiliar,
        masteryLevel: created.mastery_level,
        lastReviewedAt: created.last_reviewed_at,
        nextReviewAt: created.next_review_at,
        tags,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to handle cards request';
    sendJson(res, 500, {
      error: message,
      code: 'CARDS_UNEXPECTED_ERROR',
    });
  }
}
