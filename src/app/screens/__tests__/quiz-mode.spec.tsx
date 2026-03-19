import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QuizMode } from '../QuizMode';
import { Deck } from '../../types';

const submitAnswerMock = vi.fn(async () => {});
const loadNextQuestionMock = vi.fn(async () => {});

vi.mock('../../hooks/useQuiz', () => ({
  useQuiz: () => ({
    question: {
      cardId: 'card-1',
      term: 'Cell',
      options: ['Unit of life', 'Mountain', 'River', 'Planet'],
      deckId: 'deck-1',
    },
    isLoadingQuestion: false,
    isSubmitting: false,
    selectedMeaning: null,
    answerResult: null,
    submitAnswer: submitAnswerMock,
    loadNextQuestion: loadNextQuestionMock,
    stats: {
      correct: 0,
      wrong: 0,
      upgradedToLevel3: 0,
    },
  }),
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
});
