import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('removes card from current session when relearn is pressed', async () => {
    const onApplyMasteryAction = vi.fn(async () => {});
    const multiDeck: Deck = {
      ...deck,
      cards: [
        {
          ...deck.cards[0],
          id: 'card-1',
          term: 'Cell',
        },
        {
          ...deck.cards[0],
          id: 'card-2',
          term: 'Nucleus',
        },
        {
          ...deck.cards[0],
          id: 'card-3',
          term: 'Mitochondria',
        },
      ],
    };

    render(
      <MemoryRouter initialEntries={['/study/deck-1']}>
        <Routes>
          <Route
            path="/study/:deckId"
            element={
              <StudyMode
                deck={multiDeck}
                learnQueue={['card-1', 'card-2', 'card-3']}
                onApplyMasteryAction={onApplyMasteryAction}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Mitochondria'));
    fireEvent.click(screen.getByTestId('study-relearn-btn'));

    await waitFor(() =>
      expect(onApplyMasteryAction).toHaveBeenCalledWith('card-3', 'relearn')
    );
    expect(screen.getByText('Nucleus')).toBeInTheDocument();
    expect(screen.queryByText('Mitochondria')).not.toBeInTheDocument();
  });
});
