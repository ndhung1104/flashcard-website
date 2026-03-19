function parseTimestamp(input: unknown): number {
  if (typeof input !== 'string') {
    return Date.now();
  }

  const timestamp = Date.parse(input);
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

export function mapCardRow(row: any) {
  return {
    id: String(row.id),
    term: String(row.term ?? ''),
    meaning: String(row.meaning ?? ''),
    tags: Array.isArray(row.tags)
      ? row.tags.map((tag: unknown) => String(tag))
      : [],
    isUnfamiliar: Boolean(row.is_unfamiliar),
  };
}

export function mapDeckRows(deckRows: any[], cardRows: any[]) {
  const cardsByDeckId = new Map<string, any[]>();

  for (const card of cardRows) {
    const deckId = String(card.deck_id);
    const current = cardsByDeckId.get(deckId) ?? [];
    current.push(mapCardRow(card));
    cardsByDeckId.set(deckId, current);
  }

  return deckRows.map((deck) => ({
    id: String(deck.id),
    title: String(deck.title ?? ''),
    description: String(deck.description ?? ''),
    createdAt: parseTimestamp(deck.created_at),
    cards: cardsByDeckId.get(String(deck.id)) ?? [],
  }));
}

export function mapSingleDeck(deckRow: any, cardRows: any[]) {
  const mapped = mapDeckRows([deckRow], cardRows);
  return mapped[0];
}
