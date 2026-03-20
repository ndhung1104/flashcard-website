import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { StudyMode } from '../StudyMode';
import { Deck } from '../../types';

const baseCard = {
  meaning: 'Meaning',
  tags: ['tag'],
  isUnfamiliar: false,
  lastReviewedAt: null,
  nextReviewAt: null,
} as const;

function createDeck(cards: Deck['cards']): Deck {
  return {
    id: 'deck-1',
    title: 'Biology',
    description: 'Basics',
    createdAt: Date.now(),
    cards,
  };
}

describe('StudyMode flow', () => {
  it('renders only mastery action buttons (no previous/next navigation)', () => {
    const deck = createDeck([
      { id: 'card-1', term: 'Cell', masteryLevel: 1, ...baseCard },
    ]);

    render(
      <MemoryRouter initialEntries={['/study/deck-1']}>
        <Routes>
          <Route
            path="/study/:deckId"
            element={<StudyMode deck={deck} onApplyMasteryAction={async () => {}} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: /Previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Cell'));

    expect(screen.getByTestId('study-relearn-btn')).toHaveTextContent('Chua biet');
    expect(screen.getByTestId('study-known-btn')).toHaveTextContent('Da biet');
  });

  it('initializes queue by mastery asc and limits to first 50 cards', () => {
    const cards: Deck['cards'] = Array.from({ length: 52 }, (_, index) => ({
      id: `card-${index}`,
      term: `Card ${index}`,
      masteryLevel: index % 4 === 0 ? 0 : index % 4 === 1 ? 2 : index % 4 === 2 ? 1 : 3,
      ...baseCard,
    }));

    const deck = createDeck(cards);

    render(
      <MemoryRouter initialEntries={['/study/deck-1']}>
        <Routes>
          <Route
            path="/study/:deckId"
            element={<StudyMode deck={deck} onApplyMasteryAction={async () => {}} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('1 / 50')).toBeInTheDocument();
    // Lowest mastery card should show first.
    expect(screen.getByText(/Card \d+/)).toBeInTheDocument();
  });

  it('advances to next card for both relearn and known without revisiting', async () => {
    const onApplyMasteryAction = vi.fn(async () => {});
    const deck = createDeck([
      { id: 'card-1', term: 'A', masteryLevel: 0, ...baseCard },
      { id: 'card-2', term: 'B', masteryLevel: 1, ...baseCard },
      { id: 'card-3', term: 'C', masteryLevel: 2, ...baseCard },
    ]);

    render(
      <MemoryRouter initialEntries={['/study/deck-1']}>
        <Routes>
          <Route
            path="/study/:deckId"
            element={<StudyMode deck={deck} onApplyMasteryAction={onApplyMasteryAction} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByTestId('study-relearn-btn'));

    await waitFor(() => expect(onApplyMasteryAction).toHaveBeenCalledWith('card-1', 'relearn'));
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('A')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('B'));
    fireEvent.click(screen.getByTestId('study-known-btn'));

    await waitFor(() => expect(onApplyMasteryAction).toHaveBeenCalledWith('card-2', 'known'));
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument();
  });
});
