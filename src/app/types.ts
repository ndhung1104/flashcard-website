export interface Card {
  id: string;
  term: string;
  meaning: string;
  tags: string[];
  isUnfamiliar: boolean;
  masteryLevel: 0 | 1 | 2 | 3;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  cards: Card[];
  createdAt: number;
}

export interface ImportResult {
  totalRows: number;
  inserted: number;
  duplicates: number;
  failed: number;
}
