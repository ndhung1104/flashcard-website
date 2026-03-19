import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { Dashboard } from './screens/Dashboard';
import { DeckDetails } from './screens/DeckDetails';
import { StudyMode } from './screens/StudyMode';
import { useDecks } from './hooks/useDecks';
import { useState } from 'react';
import { CreateDeckModal } from './components/CreateDeckModal';
import { ImportModal } from './components/ImportModal';
import { Card } from './types';
import { useAuth } from './context/AuthContext';

function Root() {
  const { decks, addDeck, isLoading } = useDecks();
  const { logout } = useAuth();
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);

  return (
    <>
      <Dashboard
        decks={decks}
        isLoading={isLoading}
        onCreateDeck={() => setIsCreatingDeck(true)}
        onLogout={logout}
      />
      <CreateDeckModal
        isOpen={isCreatingDeck}
        onClose={() => setIsCreatingDeck(false)}
        onCreateDeck={addDeck}
      />
    </>
  );
}

function DeckDetailsWrapper() {
  const { deckId } = useParams();
  const { getDeck, updateDeck, isLoading } = useDecks();
  const [importDeckId, setImportDeckId] = useState<string | null>(null);
  
  const handleImport = async (newCards: Card[]) => {
    try {
      if (deckId) {
        const deck = getDeck(deckId);
        if (deck) {
          await updateDeck(deckId, { cards: [...deck.cards, ...newCards] });
        }
      }
    } finally {
      setImportDeckId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading deck...</p>
      </div>
    );
  }

  return (
    <>
      <DeckDetails
        deck={deckId ? getDeck(deckId) : undefined}
        onUpdateDeck={updateDeck}
        onOpenImport={() => setImportDeckId(deckId || null)}
      />
      {importDeckId && (
        <ImportModal
          isOpen={true}
          onClose={() => setImportDeckId(null)}
          existingCards={getDeck(importDeckId)?.cards || []}
          onImport={handleImport}
        />
      )}
    </>
  );
}

function StudyModeWrapper() {
  const { deckId } = useParams();
  const { getDeck, updateDeck, isLoading } = useDecks();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading study mode...</p>
      </div>
    );
  }
  
  return (
    <StudyMode
      deck={deckId ? getDeck(deckId) : undefined}
      onUpdateDeck={updateDeck}
    />
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
  },
  {
    path: '/deck/:deckId',
    element: <DeckDetailsWrapper />,
  },
  {
    path: '/study/:deckId',
    element: <StudyModeWrapper />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
