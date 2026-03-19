import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { StudyMode } from '../StudyMode';
import { Deck } from '../../types';

const deck: Deck = {
  id: 'deck-1',
  title: 'Biology',
  description: 'Basics',
  createdAt: Date.now(),
  cards: [
    {
      id: 'card-1',
      term: 'Cell',
      meaning: 'Basic unit of life',
      tags: ['bio'],
      isUnfamiliar: false,
      masteryLevel: 1,
      lastReviewedAt: null,
      nextReviewAt: null,
    },
  ],
};

describe('StudyMode mastery flow', () => {
  it('shows relearn and known buttons after card flip', () => {
    render(
      <MemoryRouter initialEntries={['/study/deck-1']}>
        <Routes>
          <Route
            path="/study/:deckId"
            element={
              <StudyMode
                deck={deck}
                learnQueue={['card-1']}
                onApplyMasteryAction={async () => {}}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Cell'));

    expect(screen.getByTestId('study-relearn-btn')).toBeInTheDocument();
    expect(screen.getByTestId('study-known-btn')).toBeInTheDocument();
  });
});
