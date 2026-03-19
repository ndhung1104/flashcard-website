import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, X, Star, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Deck } from '../types';

interface StudyModeProps {
  deck: Deck | undefined;
  onUpdateDeck: (deckId: string, updates: Partial<Deck>) => Promise<void> | void;
}

export function StudyMode({ deck, onUpdateDeck }: StudyModeProps) {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'Escape') {
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, deck]);

  if (!deck || !deckId || deck.cards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No cards to study</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = deck.cards[currentIndex];
  const progress = ((currentIndex + 1) / deck.cards.length) * 100;

  const handleNext = () => {
    if (currentIndex < deck.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const toggleUnfamiliar = async () => {
    if (isSavingCard) return;
    const updatedCards = deck.cards.map((card) =>
      card.id === currentCard.id ? { ...card, isUnfamiliar: !card.isUnfamiliar } : card
    );
    setIsSavingCard(true);
    try {
      await onUpdateDeck(deckId, { cards: updatedCards });
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleExit = () => {
    navigate(`/deck/${deckId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleExit}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h1 className="font-medium text-sm">{deck.title}</h1>
            <span className="text-sm text-gray-600">
              {currentIndex + 1} / {deck.cards.length}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </header>

      {/* Flashcard */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
        <div className="w-full max-w-md">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative w-full aspect-[3/2] cursor-pointer group"
            style={{ perspective: '1000px' }}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-xs uppercase text-gray-500 mb-4">Term</p>
                <p className="text-2xl font-medium text-center">{currentCard.term}</p>
                <p className="text-xs text-gray-400 mt-6">Tap to flip</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleUnfamiliar();
                  }}
                  disabled={isSavingCard}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                >
                  {isSavingCard ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <Star
                      className={`w-5 h-5 ${
                        currentCard.isUnfamiliar
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      }`}
                    />
                  )}
                </button>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 bg-blue-600 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="text-xs uppercase opacity-80 mb-4">Meaning</p>
                <p className="text-xl text-center">{currentCard.meaning}</p>
                <p className="text-xs opacity-60 mt-6">Tap to flip back</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleUnfamiliar();
                  }}
                  disabled={isSavingCard}
                  className="absolute top-4 right-4 p-2 hover:bg-blue-500 rounded-full transition-colors disabled:opacity-50"
                >
                  {isSavingCard ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white opacity-80" />
                  ) : (
                    <Star
                      className={`w-5 h-5 ${
                        currentCard.isUnfamiliar
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-white opacity-60'
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            {currentCard.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-white rounded-full text-xs text-gray-600 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t py-4">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <Button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              size="lg"
              variant="outline"
              className="flex-1 max-w-[140px]"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 px-4">
              {currentIndex + 1} of {deck.cards.length}
            </span>
            <Button
              onClick={handleNext}
              disabled={currentIndex === deck.cards.length - 1}
              size="lg"
              className="flex-1 max-w-[140px]"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
          <p className="text-xs text-center text-gray-400 hidden sm:block">
            Use ← → to navigate • Space/Enter to flip • Esc to exit
          </p>
        </div>
      </footer>
    </div>
  );
}
