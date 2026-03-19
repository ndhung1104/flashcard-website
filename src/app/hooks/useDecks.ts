import { useState, useEffect } from 'react';
import { Deck } from '../types';
import { toast } from 'sonner';

interface DecksResponse {
  decks: Deck[];
}

interface DeckResponse {
  deck: Deck;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const startedAt = Date.now();
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
    console.error('[Decks API] Request failed', {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      payload,
    });
  } else {
    console.log('[Decks API] Request succeeded', {
      url,
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
  }

  if (!response.ok) {
    if (response.status === 404 && url.startsWith('/api/')) {
      throw new Error(
        `Endpoint not found (${method} ${url}). In local dev, run a backend that serves /api (e.g. Vercel dev).`
      );
    }

    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed (${method} ${url}) - ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDecks = async () => {
      setIsLoading(true);
      try {
        const data = await requestJson<DecksResponse>('/api/decks', {
          method: 'GET',
        });
        if (isMounted) {
          setDecks(data.decks);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load decks';
        toast.error(message);
        if (isMounted) {
          setDecks([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDecks();

    return () => {
      isMounted = false;
    };
  }, []);

  const addDeck = async (deck: Deck) => {
    try {
      const data = await requestJson<DeckResponse>('/api/decks', {
        method: 'POST',
        body: JSON.stringify({
          title: deck.title,
          description: deck.description,
        }),
      });
      setDecks((previousDecks) => [data.deck, ...previousDecks]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create deck';
      toast.error(message);
      throw error;
    }
  };

  const updateDeck = async (deckId: string, updates: Partial<Deck>) => {
    try {
      const data = await requestJson<DeckResponse>(`/api/decks/${deckId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setDecks((previousDecks) =>
        previousDecks.map((deck) => (deck.id === deckId ? data.deck : deck))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update deck';
      toast.error(message);
    }
  };

  const deleteDeck = async (deckId: string) => {
    try {
      await requestJson<{ success: boolean }>(`/api/decks/${deckId}`, {
        method: 'DELETE',
      });
      setDecks((previousDecks) =>
        previousDecks.filter((deck) => deck.id !== deckId)
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete deck';
      toast.error(message);
    }
  };

  const getDeck = (deckId: string) => {
    return decks.find((deck) => deck.id === deckId);
  };

  return {
    decks,
    addDeck,
    updateDeck,
    deleteDeck,
    getDeck,
    isLoading,
  };
}
