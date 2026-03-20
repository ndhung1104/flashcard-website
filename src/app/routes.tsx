import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { Dashboard } from './screens/Dashboard';
import { DeckDetails } from './screens/DeckDetails';
import { QuizMode } from './screens/QuizMode';
import { StudyMode } from './screens/StudyMode';
import { useDecks } from './hooks/useDecks';
import { useCards } from './hooks/useCards';
import { useState } from 'react';
import { CreateDeckModal } from './components/CreateDeckModal';
import { ImportModal } from './components/ImportModal';
import { Deck } from './types';
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
  const {
    cards,
    isLoading: isLoadingCards,
    syncCards,
    refreshCards,
    isSyncing,
  } = useCards(deckId);
  const [importDeckId, setImportDeckId] = useState<string | null>(null);

  const deckMetadata = deckId ? getDeck(deckId) : undefined;
  const deckWithCards = deckMetadata
    ? ({ ...deckMetadata, cards } as Deck)
    : undefined;

  const handleUpdateDeck = async (id: string, updates: Partial<Deck>) => {
    const metadataUpdates: Partial<Deck> = {};

    if (typeof updates.title === 'string') {
      metadataUpdates.title = updates.title;
    }

    if (typeof updates.description === 'string') {
      metadataUpdates.description = updates.description;
    }

    if (Object.keys(metadataUpdates).length > 0) {
      await updateDeck(id, metadataUpdates);
    }

    if (Array.isArray(updates.cards)) {
      await syncCards(updates.cards);
    }
  };

  if (isLoading || isLoadingCards) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading deck...</p>
      </div>
    );
  }

  return (
    <>
      <DeckDetails
        deck={deckWithCards}
        onUpdateDeck={handleUpdateDeck}
        onOpenImport={() => setImportDeckId(deckId || null)}
      />
      {importDeckId && (
        <ImportModal
          isOpen={true}
          onClose={() => setImportDeckId(null)}
          deckId={importDeckId}
          onImported={refreshCards}
        />
      )}
      {isSyncing ? (
        <div className="fixed bottom-4 right-4 rounded-full bg-black text-white text-xs px-3 py-2 opacity-80">
          Syncing...
        </div>
      ) : null}
    </>
  );
}

function StudyModeWrapper() {
  const { deckId } = useParams();
  const { getDeck, isLoading } = useDecks();
  const {
    cards,
    isLoading: isLoadingCards,
    applyMasteryAction,
    refreshCards,
  } = useCards(deckId);

  const deckMetadata = deckId ? getDeck(deckId) : undefined;
  const deckWithCards = deckMetadata
    ? ({ ...deckMetadata, cards } as Deck)
    : undefined;

  const handleApplyMasteryAction = async (
    cardId: string,
    action: 'relearn' | 'known'
  ) => {
    await applyMasteryAction(cardId, action);
  };

  if (isLoading || isLoadingCards) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading study mode...</p>
      </div>
    );
  }

  return (
    <StudyMode
      deck={deckWithCards}
      onApplyMasteryAction={handleApplyMasteryAction}
      onContinueStudy={refreshCards}
    />
  );
}

function QuizModeWrapper() {
  const { deckId } = useParams();
  const { getDeck, isLoading } = useDecks();
  const { cards, isLoading: isLoadingCards } = useCards(deckId);

  const deckMetadata = deckId ? getDeck(deckId) : undefined;
  const deckWithCards = deckMetadata
    ? ({ ...deckMetadata, cards } as Deck)
    : undefined;

  if (isLoading || isLoadingCards) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading quiz mode...</p>
      </div>
    );
  }

  return <QuizMode deck={deckWithCards} />;
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
    path: '/quiz/:deckId',
    element: <QuizModeWrapper />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
