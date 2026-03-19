import { useNavigate, useParams } from 'react-router';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Deck } from '../types';
import { useQuiz } from '../hooks/useQuiz';

interface QuizModeProps {
  deck: Deck | undefined;
}

export function QuizMode({ deck }: QuizModeProps) {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const {
    question,
    isLoadingQuestion,
    isSubmitting,
    selectedMeaning,
    answerResult,
    submitAnswer,
    loadNextQuestion,
    stats,
  } = useQuiz(deckId);

  if (!deckId || !deck) {
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

  const isAnswered = Boolean(answerResult);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Quiz Mode</p>
            <h1 className="font-semibold text-lg">{deck.title}</h1>
          </div>
          <button
            onClick={() => navigate(`/deck/${deckId}`)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card className="p-4 bg-white/90">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-gray-500">Ðúng</p>
              <p className="font-semibold text-green-600">{stats.correct}</p>
            </div>
            <div>
              <p className="text-gray-500">Sai</p>
              <p className="font-semibold text-red-600">{stats.wrong}</p>
            </div>
            <div>
              <p className="text-gray-500">Lên Lv3</p>
              <p className="font-semibold text-blue-600">{stats.upgradedToLevel3}</p>
            </div>
          </div>
        </Card>

        {isLoadingQuestion ? (
          <Card className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-500">Loading question...</p>
          </Card>
        ) : !question ? (
          <Card className="p-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Không còn câu h?i phù h?p</h2>
            <p className="text-sm text-gray-600 mb-4">
              Các th? dã thu?c dã du?c t?m ?n kh?i quiz hi?n t?i.
            </p>
            <Button onClick={() => navigate(`/study/${deckId}`)}>Qua Study Mode</Button>
          </Card>
        ) : (
          <Card className="p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">T? v?ng</p>
              <h2 className="text-2xl font-semibold">{question.term}</h2>
            </div>

            <div className="space-y-2">
              {question.options.map((option) => {
                const isSelected = selectedMeaning === option;
                const isCorrectOption = answerResult?.correctMeaning === option;

                let className = 'w-full justify-start';
                if (isAnswered && isCorrectOption) {
                  className += ' border-green-500 bg-green-50 text-green-700';
                } else if (isAnswered && isSelected && !isCorrectOption) {
                  className += ' border-red-500 bg-red-50 text-red-700';
                }

                return (
                  <Button
                    key={option}
                    variant="outline"
                    className={className}
                    disabled={isSubmitting || isAnswered}
                    onClick={() => void submitAnswer(option)}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>

            {isAnswered ? (
              <div className="space-y-3 pt-2">
                <p className={`text-sm font-medium ${answerResult?.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {answerResult?.isCorrect
                    ? `? Chính xác! Mastery hi?n t?i: ${answerResult.masteryLevel}`
                    : `? Sai. Ðáp án dúng: ${answerResult?.correctMeaning} (Mastery: ${answerResult?.masteryLevel})`}
                </p>
                <Button onClick={() => void loadNextQuestion()} className="w-full">
                  Câu ti?p theo
                </Button>
              </div>
            ) : null}
          </Card>
        )}
      </main>
    </div>
  );
}
