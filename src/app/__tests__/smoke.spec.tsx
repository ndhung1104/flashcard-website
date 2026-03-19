import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Dashboard } from '../screens/Dashboard';
import { DeckDetails } from '../screens/DeckDetails';
import { StudyMode } from '../screens/StudyMode';
import { Deck } from '../types';

const sampleDeck: Deck = {
  id: 'deck-1',
  title: 'Biology Basics',
  description: 'Core terms for chapter 1',
  createdAt: Date.now(),
  cards: [
    {
      id: 'card-1',
      term: 'Cell',
      meaning: 'Basic unit of life',
      tags: ['bio', 'chapter1'],
      isUnfamiliar: false,
      masteryLevel: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    },
  ],
};

describe('app smoke screens', () => {
  it('renders dashboard with deck list', () => {
    render(
      <MemoryRouter>
        <Dashboard
          decks={[sampleDeck]}
          isLoading={false}
          onCreateDeck={() => {}}
          onLogout={async () => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Flashcards' })).toBeInTheDocument();
    expect(screen.getByText('Biology Basics')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study' })).toBeInTheDocument();
  });

  it('renders deck details screen', () => {
    render(
      <MemoryRouter initialEntries={['/deck/deck-1']}>
        <Routes>
          <Route
            path="/deck/:deckId"
            element={
              <DeckDetails
                deck={sampleDeck}
                onUpdateDeck={async () => {}}
                onOpenImport={() => {}}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Biology Basics' })).toBeInTheDocument();
    expect(screen.getByText('Cell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });

  it('renders study mode screen', () => {
    render(
      <MemoryRouter initialEntries={['/study/deck-1']}>
        <Routes>
          <Route
            path="/study/:deckId"
            element={<StudyMode deck={sampleDeck} onUpdateDeck={async () => {}} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Biology Basics')).toBeInTheDocument();
    expect(screen.getByText('Cell')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });
});
