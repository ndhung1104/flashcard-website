import { useCallback, useEffect, useState } from 'react';

export interface QuizQuestion {
  cardId: string;
  term: string;
  options: string[];
  deckId: string;
}

interface QuizNextResponse {
  question: QuizQuestion | null;
}

interface QuizAnswerResponse {
  isCorrect: boolean;
  correctMeaning: string;
  masteryLevel: number;
}

interface QuizStats {
  correct: number;
  wrong: number;
  upgradedToLevel3: number;
}

export function useQuiz(deckId: string | undefined) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<QuizAnswerResponse | null>(null);
  const [answeredCardIds, setAnsweredCardIds] = useState<string[]>([]);
  const [stats, setStats] = useState<QuizStats>({
    correct: 0,
    wrong: 0,
    upgradedToLevel3: 0,
  });

  const fetchQuestion = useCallback(async (excludeCardIds: string[] = []) => {
    if (!deckId) {
      setQuestion(null);
      setIsLoadingQuestion(false);
      return;
    }

    setIsLoadingQuestion(true);
    setSelectedMeaning(null);
    setAnswerResult(null);

    try {
      const params = new URLSearchParams({
        deckId,
      });

      if (excludeCardIds.length > 0) {
        params.set('excludeCardIds', excludeCardIds.join(','));
      }

      const response = await fetch(`/api/quiz/next?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      const payload = (await response.json().catch(() => ({}))) as QuizNextResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to load quiz question (${response.status})`);
      }

      setQuestion(payload.question ?? null);
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [deckId]);

  const loadNextQuestion = useCallback(async () => {
    await fetchQuestion(answeredCardIds);
  }, [answeredCardIds, fetchQuestion]);

  const restartQuiz = useCallback(async () => {
    setAnsweredCardIds([]);
    setStats({
      correct: 0,
      wrong: 0,
      upgradedToLevel3: 0,
    });
    await fetchQuestion([]);
  }, [fetchQuestion]);

  useEffect(() => {
    setAnsweredCardIds([]);
    setStats({
      correct: 0,
      wrong: 0,
      upgradedToLevel3: 0,
    });
    void fetchQuestion([]);
  }, [fetchQuestion]);

  const submitAnswer = useCallback(
    async (meaning: string) => {
      if (!deckId || !question || isSubmitting || answerResult) {
        return;
      }

      setIsSubmitting(true);
      setSelectedMeaning(meaning);

      try {
        const response = await fetch('/api/quiz/answer', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deckId,
            cardId: question.cardId,
            selectedMeaning: meaning,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as QuizAnswerResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? `Failed to submit answer (${response.status})`);
        }

        setAnswerResult(payload);
        setAnsweredCardIds((previous) => {
          if (previous.includes(question.cardId)) {
            return previous;
          }
          return [...previous, question.cardId];
        });
        setStats((previous) => ({
          correct: previous.correct + (payload.isCorrect ? 1 : 0),
          wrong: previous.wrong + (payload.isCorrect ? 0 : 1),
          upgradedToLevel3:
            previous.upgradedToLevel3 + (payload.masteryLevel === 3 ? 1 : 0),
        }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [answerResult, deckId, isSubmitting, question]
  );

  return {
    question,
    isLoadingQuestion,
    isSubmitting,
    selectedMeaning,
    answerResult,
    submitAnswer,
    loadNextQuestion,
    restartQuiz,
    stats,
  };
}
