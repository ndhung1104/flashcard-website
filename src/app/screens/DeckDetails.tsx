import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Upload,
  Star,
  Filter,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card as UICard } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Deck, Card } from '../types';
import { generateId } from '../utils/import';

interface DeckDetailsProps {
  deck: Deck | undefined;
  onUpdateDeck: (deckId: string, updates: Partial<Deck>) => Promise<void> | void;
  onOpenImport: () => void;
}

export function DeckDetails({ deck, onUpdateDeck, onOpenImport }: DeckDetailsProps) {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showUnfamiliarOnly, setShowUnfamiliarOnly] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isSavingDeck, setIsSavingDeck] = useState(false);
  const [isAddingCardSubmitting, setIsAddingCardSubmitting] = useState(false);
  const [pendingToggleCardId, setPendingToggleCardId] = useState<string | null>(null);
  const [pendingDeleteCardId, setPendingDeleteCardId] = useState<string | null>(null);

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

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    deck.cards.forEach((card) => card.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags);
  }, [deck.cards]);

  const filteredCards = useMemo(() => {
    return deck.cards.filter((card) => {
      if (showUnfamiliarOnly && !card.isUnfamiliar) return false;
      if (filterTag !== 'all' && !card.tags.includes(filterTag)) return false;
      return true;
    });
  }, [deck.cards, filterTag, showUnfamiliarOnly]);

  const toggleUnfamiliar = async (cardId: string) => {
    if (isSavingDeck) return;
    const updatedCards = deck.cards.map((card) =>
      card.id === cardId ? { ...card, isUnfamiliar: !card.isUnfamiliar } : card
    );
    setPendingToggleCardId(cardId);
    setIsSavingDeck(true);
    try {
      await onUpdateDeck(deckId, { cards: updatedCards });
    } finally {
      setPendingToggleCardId(null);
      setIsSavingDeck(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    if (isSavingDeck) return;
    const updatedCards = deck.cards.filter((card) => card.id !== cardId);
    setPendingDeleteCardId(cardId);
    setIsSavingDeck(true);
    try {
      await onUpdateDeck(deckId, { cards: updatedCards });
    } finally {
      setPendingDeleteCardId(null);
      setIsSavingDeck(false);
    }
  };

  const handleAddCard = async () => {
    if (!newTerm.trim() || !newMeaning.trim() || isAddingCardSubmitting || isSavingDeck) {
      return;
    }

    const newCard: Card = {
      id: generateId(),
      term: newTerm.trim(),
      meaning: newMeaning.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      isUnfamiliar: false,
      masteryLevel: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    };

    setIsAddingCardSubmitting(true);
    setIsSavingDeck(true);
    try {
      await onUpdateDeck(deckId, { cards: [...deck.cards, newCard] });
      setNewTerm('');
      setNewMeaning('');
      setNewTags('');
      setIsAddingCard(false);
    } finally {
      setIsAddingCardSubmitting(false);
      setIsSavingDeck(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate('/')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-lg flex-1">{deck.title}</h1>
          </div>

          {/* Toolbar */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={onOpenImport}
              variant="outline"
              size="sm"
              disabled={isSavingDeck}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={() => setIsAddingCard(true)}
              variant="outline"
              size="sm"
              disabled={isSavingDeck}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-[140px] h-8">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowUnfamiliarOnly(!showUnfamiliarOnly)}
              variant={showUnfamiliarOnly ? 'default' : 'outline'}
              size="sm"
              disabled={isSavingDeck}
            >
              <Star className="w-4 h-4 mr-2" />
              Unfamiliar
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              {deck.cards.length === 0
                ? 'No cards yet. Add or import cards to get started.'
                : 'No cards match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCards.map((card) => (
              <UICard key={card.id} className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <p className="font-medium mb-1">{card.term}</p>
                        <p className="text-sm text-gray-600">{card.meaning}</p>
                      </div>
                      <button
                        onClick={() => void toggleUnfamiliar(card.id)}
                        disabled={isSavingDeck}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      >
                        {pendingToggleCardId === card.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        ) : (
                          <Star
                            className={`w-5 h-5 ${
                              card.isUnfamiliar
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-400'
                            }`}
                          />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {card.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => void deleteCard(card.id)}
                    disabled={isSavingDeck}
                    className="p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    {pendingDeleteCardId === card.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                </div>
              </UICard>
            ))}
          </div>
        )}
      </main>

      {/* Add Card Dialog */}
      <Dialog
        open={isAddingCard}
        onOpenChange={(open) => {
          if (!isAddingCardSubmitting && !isSavingDeck) {
            setIsAddingCard(open);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Term</label>
              <Input
                placeholder="Enter term or question"
                value={newTerm}
                disabled={isAddingCardSubmitting || isSavingDeck}
                onChange={(e) => setNewTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meaning</label>
              <Textarea
                placeholder="Enter meaning or answer"
                value={newMeaning}
                disabled={isAddingCardSubmitting || isSavingDeck}
                onChange={(e) => setNewMeaning(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags (comma-separated)</label>
              <Input
                placeholder="e.g., history, chapter1"
                value={newTags}
                disabled={isAddingCardSubmitting || isSavingDeck}
                onChange={(e) => setNewTags(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddingCard(false)}
                disabled={isAddingCardSubmitting || isSavingDeck}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleAddCard()}
                disabled={isAddingCardSubmitting || isSavingDeck}
              >
                {isAddingCardSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Add Card'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
