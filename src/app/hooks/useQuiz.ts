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
  masteryLevel: 0 | 1 | 2 | 3;
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
  const [stats, setStats] = useState<QuizStats>({
    correct: 0,
    wrong: 0,
    upgradedToLevel3: 0,
  });

  const loadNextQuestion = useCallback(async () => {
    if (!deckId) {
      setQuestion(null);
      setIsLoadingQuestion(false);
      return;
    }

    setIsLoadingQuestion(true);
    setSelectedMeaning(null);
    setAnswerResult(null);

    try {
      const response = await fetch(`/api/quiz/next?deckId=${encodeURIComponent(deckId)}`, {
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

  useEffect(() => {
    void loadNextQuestion();
  }, [loadNextQuestion]);

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
    stats,
  };
}
