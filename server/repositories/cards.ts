import { normalizeTerm } from '../normalize.js';

export interface CreateCardInput {
  userId: string;
  deckId: string;
  term: string;
  meaning: string;
  tags?: string[];
  isUnfamiliar?: boolean;
}

export interface CardRecord {
  id: string;
  user_id: string;
  deck_id: string;
  term: string;
  meaning: string;
  normalized_term: string;
  tags: string[];
  is_unfamiliar: boolean;
  mastery_level: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
}

export async function listCardsByDeck(
  supabase: any,
  userId: string,
  deckId: string
): Promise<CardRecord[]> {
  const { data, error } = await supabase
    .from('cards')
    .select(
      'id, user_id, deck_id, term, meaning, normalized_term, tags, is_unfamiliar, mastery_level, last_reviewed_at, next_review_at'
    )
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardRecord[];
}

export async function getCardById(
  supabase: any,
  userId: string,
  cardId: string
): Promise<CardRecord | null> {
  const { data, error } = await supabase
    .from('cards')
    .select(
      'id, user_id, deck_id, term, meaning, normalized_term, tags, is_unfamiliar, mastery_level, last_reviewed_at, next_review_at'
    )
    .eq('user_id', userId)
    .eq('id', cardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CardRecord | null) ?? null;
}

export async function insertCardsIgnoreDuplicates(
  supabase: any,
  cards: CreateCardInput[]
): Promise<CardRecord[]> {
  if (cards.length === 0) {
    return [];
  }

  const rows = cards.map((card) => ({
    user_id: card.userId,
    deck_id: card.deckId,
    term: card.term.trim(),
    meaning: card.meaning.trim(),
    normalized_term: normalizeTerm(card.term),
    tags: Array.isArray(card.tags) ? card.tags : [],
    is_unfamiliar: Boolean(card.isUnfamiliar),
  }));

  const { data, error } = await supabase
    .from('cards')
    .upsert(rows, {
      onConflict: 'user_id,deck_id,normalized_term',
      ignoreDuplicates: true,
    })
    .select(
      'id, user_id, deck_id, term, meaning, normalized_term, tags, is_unfamiliar, mastery_level, last_reviewed_at, next_review_at'
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardRecord[];
}

export async function setCardMastery(
  supabase: any,
  userId: string,
  cardId: string,
  masteryLevel: number,
  lastReviewedAt: string | null,
  nextReviewAt: string | null
): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({
      mastery_level: masteryLevel,
      last_reviewed_at: lastReviewedAt,
      next_review_at: nextReviewAt,
      is_unfamiliar: masteryLevel === 1,
    })
    .eq('id', cardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
