import { normalizeTerm } from '../normalize.js';

export interface CreateCardInput {
  userId: string;
  deckId: string;
  term: string;
  meaning: string;
  isUnfamiliar?: boolean;
}

export interface CardRecord {
  id: string;
  user_id: string;
  deck_id: string;
  term: string;
  meaning: string;
  normalized_term: string;
  is_unfamiliar: boolean;
}

export async function listCardsByDeck(
  supabase: any,
  userId: string,
  deckId: string
): Promise<CardRecord[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('id, user_id, deck_id, term, meaning, normalized_term, is_unfamiliar')
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardRecord[];
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
    is_unfamiliar: Boolean(card.isUnfamiliar),
  }));

  const { data, error } = await supabase
    .from('cards')
    .upsert(rows, {
      onConflict: 'user_id,deck_id,normalized_term',
      ignoreDuplicates: true,
    })
    .select('id, user_id, deck_id, term, meaning, normalized_term, is_unfamiliar');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CardRecord[];
}

export async function setCardUnfamiliar(
  supabase: any,
  userId: string,
  cardId: string,
  isUnfamiliar: boolean
): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ is_unfamiliar: isUnfamiliar })
    .eq('id', cardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
