import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Deck } from '../types';

const STUDY_QUEUE_LIMIT = 50;

interface StudyModeProps {
  deck: Deck | undefined;
  onApplyMasteryAction: (
    cardId: string,
    action: 'relearn' | 'known'
  ) => Promise<void> | void;
}

export function StudyMode({ deck, onApplyMasteryAction }: StudyModeProps) {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [sessionQueueIds, setSessionQueueIds] = useState<string[]>([]);
  const [hasSessionInitialized, setHasSessionInitialized] = useState(false);

  const cardById = useMemo(
    () => new Map((deck?.cards ?? []).map((card) => [card.id, card])),
    [deck?.cards]
  );

  const initialQueueIds = useMemo(() => {
    if (!deck) {
      return [] as string[];
    }

    return [...deck.cards]
      .sort((left, right) => left.masteryLevel - right.masteryLevel)
      .slice(0, STUDY_QUEUE_LIMIT)
      .map((card) => card.id);
  }, [deck]);

  useEffect(() => {
    setSessionQueueIds([]);
    setIsFlipped(false);
    setHasSessionInitialized(false);
  }, [deckId]);

  useEffect(() => {
    if (hasSessionInitialized || initialQueueIds.length === 0) {
      return;
    }

    setSessionQueueIds(initialQueueIds);
    setIsFlipped(false);
    setHasSessionInitialized(true);
  }, [hasSessionInitialized, initialQueueIds]);

  const activeCards = useMemo(
    () => sessionQueueIds.map((id) => cardById.get(id)).filter(Boolean),
    [sessionQueueIds, cardById]
  );

  const currentCard = activeCards[0];
  const totalSessionCards = initialQueueIds.length;
  const processedCount = totalSessionCards - activeCards.length;
  const currentPosition = activeCards.length > 0 ? processedCount + 1 : totalSessionCards;
  const progress = totalSessionCards > 0 ? (processedCount / totalSessionCards) * 100 : 0;

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!currentCard) return;

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (event.key === 'Escape') {
        navigate(`/deck/${deckId}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCard, deckId, navigate]);

  if (!deck || !deckId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Deck not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (deck.cards.length === 0) {
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

  if (activeCards.length === 0 || !currentCard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dot hoc da xong</h2>
          <p className="text-sm text-gray-600 mb-6">
            Ban da hoan thanh queue hoc cho dot nay.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(`/deck/${deckId}`)}>
              Ve Deck
            </Button>
            <Button onClick={() => navigate(`/quiz/${deckId}`)}>Qua Quiz</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleExit = () => {
    navigate(`/deck/${deckId}`);
  };

  const handleMasteryAction = async (action: 'relearn' | 'known') => {
    if (isSavingCard || !currentCard) {
      return;
    }

    const currentCardId = currentCard.id;
    setIsSavingCard(true);
    try {
      await onApplyMasteryAction(currentCardId, action);
      setSessionQueueIds((previous) => previous.filter((id) => id !== currentCardId));
      setIsFlipped(false);
    } finally {
      setIsSavingCard(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
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
              {currentPosition} / {totalSessionCards}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-160px)]">
        <div className="w-full max-w-md">
          <p className="text-center text-xs text-gray-500 mb-4">
            Nhin tu vung va tu nho nghia truoc khi lat the
          </p>
          <div
            onClick={() => setIsFlipped((prev) => !prev)}
            className="relative w-full aspect-[3/2] cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-xs uppercase text-gray-500 mb-4">Tu vung</p>
                <p className="text-2xl font-medium text-center">{currentCard.term}</p>
                <p className="text-xs text-gray-400 mt-6">Click/Tap de lat the</p>
              </div>

              <div
                className="absolute inset-0 bg-blue-600 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-xs uppercase opacity-80 mb-4">Dinh nghia</p>
                <p className="text-xl text-center">{currentCard.meaning}</p>
                <p className="text-xs opacity-60 mt-6">Tap de lat lai</p>
              </div>
            </div>
          </div>

          {isFlipped ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => void handleMasteryAction('relearn')}
                disabled={isSavingCard}
                className="h-11"
                data-testid="study-relearn-btn"
              >
                {isSavingCard ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Chua biet
                  </>
                )}
              </Button>
              <Button
                onClick={() => void handleMasteryAction('known')}
                disabled={isSavingCard}
                className="h-11"
                data-testid="study-known-btn"
              >
                {isSavingCard ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Da biet'
                )}
              </Button>
            </div>
          ) : null}

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
    </div>
  );
}
