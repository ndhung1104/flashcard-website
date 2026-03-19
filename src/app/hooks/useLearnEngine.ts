import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface LearnQueueResponse {
  queue: string[];
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
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

export function useLearnEngine(deckId: string | undefined, includeMastered = false) {
  const [queue, setQueue] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshQueue = useCallback(async () => {
    if (!deckId) {
      setQueue([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await requestJson<LearnQueueResponse>(
        `/api/learn/queue?deckId=${encodeURIComponent(deckId)}&includeMastered=${includeMastered}`
      );
      setQueue(Array.isArray(data.queue) ? data.queue : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load learning queue';
      toast.error(message);
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, [deckId, includeMastered]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  return {
    queue,
    isLoading,
    refreshQueue,
  };
}
