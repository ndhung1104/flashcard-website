import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Deck } from '../types';

interface StudyModeProps {
  deck: Deck | undefined;
  learnQueue?: string[];
  onApplyMasteryAction: (
    cardId: string,
    action: 'relearn' | 'known'
  ) => Promise<void> | void;
}

export function StudyMode({
  deck,
  learnQueue,
  onApplyMasteryAction,
}: StudyModeProps) {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
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

    if (Array.isArray(learnQueue) && learnQueue.length > 0) {
      return learnQueue.filter((id) => cardById.has(id));
    }

    return deck.cards.map((card) => card.id);
  }, [deck, learnQueue, cardById]);

  useEffect(() => {
    setSessionQueueIds([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHasSessionInitialized(false);
  }, [deckId]);

  useEffect(() => {
    if (hasSessionInitialized || initialQueueIds.length === 0) {
      return;
    }

    setSessionQueueIds(initialQueueIds);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHasSessionInitialized(true);
  }, [hasSessionInitialized, initialQueueIds]);

  const activeCards = useMemo(
    () => sessionQueueIds.map((id) => cardById.get(id)).filter(Boolean),
    [sessionQueueIds, cardById]
  );

  const currentCard = activeCards[currentIndex];

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentCard) return;

      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        setIsFlipped(false);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(activeCards.length - 1, prev + 1));
        setIsFlipped(false);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'Escape') {
        navigate(`/deck/${deckId}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeCards.length, currentCard, deckId, navigate]);

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
            Cac the level cao da duoc an tam thoi. Ban co the quay lai deck hoac vao quiz.
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

  // const progress = ((currentIndex + 1) / activeCards.length) * 100;
  // Thêm 1 biến memo để giữ tổng số thẻ của session
  const totalSessionCards = useMemo(() => initialQueueIds.length, [initialQueueIds]);

  // Tính số thẻ đã loại khỏi queue (tức là đã thuộc)
  const learnedCount = totalSessionCards - activeCards.length;

  // Progress = (Số thẻ đã thuộc / Tổng số thẻ) * 100
  const progress = totalSessionCards > 0 ? (learnedCount / totalSessionCards) * 100 : 0;

  const handleExit = () => {
    navigate(`/deck/${deckId}`);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setIsFlipped(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(activeCards.length - 1, prev + 1));
    setIsFlipped(false);
  };

  const handleMasteryAction = async (action: 'relearn' | 'known') => {
    if (isSavingCard || !currentCard) {
    return;
  }

  const currentCardId = currentCard.id;
  setIsSavingCard(true);
  try {
    await onApplyMasteryAction(currentCardId, action);

    const queueSnapshot = [...sessionQueueIds];
    const currentQueueIndex = queueSnapshot.indexOf(currentCardId);

    if (currentQueueIndex !== -1) {
      if (action === 'known') {
        // NẾU ĐÃ BIẾT: Xóa khỏi queue
        queueSnapshot.splice(currentQueueIndex, 1);
        
        const nextIndex = queueSnapshot.length === 0
            ? 0
            : Math.min(currentQueueIndex, queueSnapshot.length - 1);
            
        setSessionQueueIds(queueSnapshot);
        setCurrentIndex(nextIndex);
      } else {
        // NẾU CHƯA THUỘC: Đẩy thẻ xuống cuối queue để học lại sau
        queueSnapshot.splice(currentQueueIndex, 1);
        queueSnapshot.push(currentCardId);
        
        setSessionQueueIds(queueSnapshot);
        // Vì thẻ hiện tại đã bị nhấc ra và đặt xuống cuối, 
        // thẻ tiếp theo sẽ tự động trượt lên vị trí currentQueueIndex.
        // Cần đảm bảo index không vượt quá độ dài mảng (nếu chỉ còn 1 thẻ).
        const nextIndex = currentQueueIndex >= queueSnapshot.length 
            ? 0 
            : currentQueueIndex;
        setCurrentIndex(nextIndex);
      }
    }

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
              {currentIndex + 1} / {activeCards.length}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-md">
          <p className="text-center text-xs text-gray-500 mb-4">
            Ban nhin "Tu vung" va tu nham "Dinh nghia" trong dau
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
                    Hoc lai (Chua thuoc)
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
                  'Da biet (Thuoc)'
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

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t py-4">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <Button
              onClick={handlePrevious}
              disabled={currentIndex === 0 || isSavingCard}
              size="lg"
              variant="outline"
              className="flex-1 max-w-[140px]"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 px-4">
              {currentIndex + 1} of {activeCards.length}
            </span>
            <Button
              onClick={handleNext}
              disabled={currentIndex === activeCards.length - 1 || isSavingCard}
              size="lg"
              className="flex-1 max-w-[140px]"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
          <p className="text-xs text-center text-gray-400 hidden sm:block">
            Use left and right arrows to navigate | Space/Enter to flip | Esc to exit
          </p>
        </div>
      </footer>
    </div>
  );
}

