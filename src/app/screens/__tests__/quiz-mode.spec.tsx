import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QuizMode } from '../QuizMode';
import { Deck } from '../../types';

const submitAnswerMock = vi.fn(async () => {});
const loadNextQuestionMock = vi.fn(async () => {});
const restartQuizMock = vi.fn(async () => {});

const quizState = {
  question: {
    cardId: 'card-1',
    term: 'Cell',
    options: ['Unit of life', 'Mountain', 'River', 'Planet'],
    deckId: 'deck-1',
  },
  isLoadingQuestion: false,
  isSubmitting: false,
  selectedMeaning: null as string | null,
  answerResult: null as null | { isCorrect: boolean; correctMeaning: string; masteryLevel: number },
  submitAnswer: submitAnswerMock,
  loadNextQuestion: loadNextQuestionMock,
  restartQuiz: restartQuizMock,
  stats: {
    correct: 0,
    wrong: 0,
    upgradedToLevel3: 0,
  },
};

vi.mock('../../hooks/useQuiz', () => ({
  useQuiz: () => quizState,
}));

const deck: Deck = {
  id: 'deck-1',
  title: 'Biology',
  description: 'Basics',
  createdAt: Date.now(),
  cards: [
    {
      id: 'card-1',
      term: 'Cell',
      meaning: 'Unit of life',
      tags: ['bio'],
      isUnfamiliar: false,
      masteryLevel: 1,
      lastReviewedAt: null,
      nextReviewAt: null,
    },
  ],
};

describe('QuizMode interactions', () => {
  beforeEach(() => {
    submitAnswerMock.mockClear();
    loadNextQuestionMock.mockClear();
    restartQuizMock.mockClear();
    quizState.question = {
      cardId: 'card-1',
      term: 'Cell',
      options: ['Unit of life', 'Mountain', 'River', 'Planet'],
      deckId: 'deck-1',
    };
    quizState.isLoadingQuestion = false;
    quizState.answerResult = null;
    quizState.selectedMeaning = null;
  });

  it('submits selected option when clicking an answer', () => {
    render(
      <MemoryRouter initialEntries={['/quiz/deck-1']}>
        <Routes>
          <Route path="/quiz/:deckId" element={<QuizMode deck={deck} />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unit of life' }));

    expect(submitAnswerMock).toHaveBeenCalledWith('Unit of life');
  });

  it('shows restart and back-to-deck buttons when no question remains', () => {
    quizState.question = null;

    render(
      <MemoryRouter initialEntries={['/quiz/deck-1']}>
        <Routes>
          <Route path="/quiz/:deckId" element={<QuizMode deck={deck} />} />
          <Route path="/deck/:deckId" element={<div>Deck page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Bat dau quiz moi' }));
    expect(restartQuizMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Ve deck' }));
    expect(screen.getByText('Deck page')).toBeInTheDocument();
  });
});
