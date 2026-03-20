import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Deck } from '../types';

interface DashboardProps {
  decks: Deck[];
  isLoading: boolean;
  onCreateDeck: () => void;
  onLogout: () => Promise<void>;
}

export function Dashboard({
  decks,
  isLoading,
  onCreateDeck,
  onLogout,
}: DashboardProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch {
      // Error toast is handled by auth flow; keep button state stable.
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <h1 className="font-semibold text-lg">Flashcards</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                'Logout'
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-gray-500">
            Loading decks...
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-600 mb-2">No Decks Yet</h2>
            <p className="text-sm text-gray-500 mb-6">
              Create your first deck to start studying
            </p>
            <Button onClick={onCreateDeck} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create New Deck
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => (
              <Card key={deck.id} className="p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium mb-1">{deck.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{deck.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
                  </span>
                  <div className="flex gap-2">
                    <Link to={`/deck/${deck.id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                    <Link to={`/study/${deck.id}`}>
                      <Button size="sm" disabled={deck.cards.length === 0}>
                        Study
                      </Button>
                    </Link>
                    <Link to={`/quiz/${deck.id}`}>
                      <Button variant="outline" size="sm" disabled={deck.cards.length === 0}>
                        Quiz
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      {decks.length > 0 && (
        <button
          onClick={onCreateDeck}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

