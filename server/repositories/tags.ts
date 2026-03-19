import { normalizeTagName } from '../normalize.js';

export interface TagRecord {
  id: string;
  name: string;
  deck_id: string;
  user_id: string;
}

export async function listTagsByDeck(
  supabase: any,
  userId: string,
  deckId: string
): Promise<TagRecord[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, deck_id, user_id')
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TagRecord[];
}

export async function getOrCreateTags(
  supabase: any,
  userId: string,
  deckId: string,
  names: string[]
): Promise<TagRecord[]> {
  const normalizedNames = Array.from(
    new Set(names.map((name) => normalizeTagName(name)).filter(Boolean))
  );

  if (normalizedNames.length === 0) {
    return [];
  }

  const existing = await listTagsByDeck(supabase, userId, deckId);
  const existingMap = new Map(existing.map((tag) => [tag.name.toLowerCase(), tag]));

  const missingNames = normalizedNames.filter(
    (name) => !existingMap.has(name.toLowerCase())
  );

  if (missingNames.length > 0) {
    const rowsToInsert = missingNames.map((name) => ({
      user_id: userId,
      deck_id: deckId,
      name,
    }));

    const { error } = await supabase.from('tags').insert(rowsToInsert);
    if (error) {
      throw new Error(error.message);
    }
  }

  const updated = await listTagsByDeck(supabase, userId, deckId);
  const updatedMap = new Map(updated.map((tag) => [tag.name.toLowerCase(), tag]));

  return normalizedNames
    .map((name) => updatedMap.get(name.toLowerCase()))
    .filter(Boolean) as TagRecord[];
}
