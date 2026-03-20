import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../types';

interface CardsResponse {
  cards: Card[];
}

interface CardResponse {
  card: Card;
}

interface MasteryResponse {
  cardId: string;
  masteryLevel: number;
  lastReviewedAt: string;
  nextReviewAt: string | null;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function toCreatePayload(card: Card, deckId: string) {
  return {
    deckId,
    term: card.term,
    meaning: card.meaning,
    tags: card.tags,
  };
}

export function useCards(deckId: string | undefined) {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCards = useCallback(async () => {
    if (!deckId) {
      setCards([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await requestJson<CardsResponse>(
        `/api/cards?deckId=${encodeURIComponent(deckId)}`,
        { method: 'GET' }
      );
      setCards(data.cards);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load cards';
      toast.error(message);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    void refreshCards();
  }, [refreshCards]);

  const syncCards = useCallback(
    async (nextCards: Card[]) => {
      if (!deckId) {
        return;
      }

      setIsSyncing(true);

      const currentById = new Map(cards.map((card) => [card.id, card]));
      const nextById = new Map(nextCards.map((card) => [card.id, card]));

      const removedCards = cards.filter((card) => !nextById.has(card.id));
      const addedCards = nextCards.filter((card) => !currentById.has(card.id));
      const toggledCards = nextCards.filter((card) => {
        const current = currentById.get(card.id);
        return current && current.isUnfamiliar !== card.isUnfamiliar;
      });

      try {
        for (const removed of removedCards) {
          await requestJson<{ success: boolean }>(`/api/cards/${removed.id}`, {
            method: 'DELETE',
          });
        }

        for (const added of addedCards) {
          await requestJson<CardResponse>('/api/cards', {
            method: 'POST',
            body: JSON.stringify(toCreatePayload(added, deckId)),
          });
        }

        for (const toggled of toggledCards) {
          await requestJson<{ success: boolean }>(
            `/api/cards/${toggled.id}/unfamiliar`,
            {
              method: 'PATCH',
              body: JSON.stringify({ isUnfamiliar: toggled.isUnfamiliar }),
            }
          );
        }

        await refreshCards();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to sync cards';
        toast.error(message);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [cards, deckId, refreshCards]
  );

  const applyMasteryAction = useCallback(
    async (cardId: string, action: 'relearn' | 'known') => {
      const payload = await requestJson<MasteryResponse>(`/api/cards/${cardId}/mastery`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setCards((previous) =>
        previous.map((card) =>
          card.id === cardId
            ? {
                ...card,
                masteryLevel: payload.masteryLevel,
                lastReviewedAt: payload.lastReviewedAt,
                nextReviewAt: payload.nextReviewAt,
                isUnfamiliar: payload.masteryLevel === 1,
              }
            : card
        )
      );
    },
    []
  );

  return {
    cards,
    isLoading,
    isSyncing,
    refreshCards,
    syncCards,
    applyMasteryAction,
  };
}
