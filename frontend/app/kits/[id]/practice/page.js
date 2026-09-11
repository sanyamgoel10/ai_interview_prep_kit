'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Navbar from '@/components/kit/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

const CONFIDENCE_LABELS = { 1: '😕 Not sure', 2: '🙂 Got it', 3: '😄 Nailed it' };

export default function PracticePage() {
  const { id } = useParams();
  const router = useRouter();
  const [kit, setKit] = useState(null);
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ covered: 0, total: 0 });

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    api.getKit(id).then(k => {
      setKit(k);
      // Sort by confidence ascending (least confident first), then unplayed
      const sorted = [...(k.flashcards || [])].sort((a, b) => {
        if (a.practiceCount === 0 && b.practiceCount > 0) return -1;
        if (b.practiceCount === 0 && a.practiceCount > 0) return 1;
        return (a.confidence || 0) - (b.confidence || 0);
      });
      setCards(sorted);
      const covered = k.flashcards?.filter(f => f.practiceCount > 0).length || 0;
      setStats({ covered, total: k.flashcards?.length || 0 });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function handleConfidence(confidence) {
    const card = cards[idx];
    await api.updateFlashcardConfidence(id, card.id, confidence);

    // Update local state
    const updatedCards = cards.map((c, i) =>
      i === idx ? { ...c, confidence, practiceCount: (c.practiceCount || 0) + 1 } : c
    );
    setCards(updatedCards);
    setStats(s => ({ ...s, covered: updatedCards.filter(c => c.practiceCount > 0).length }));

    if (idx + 1 >= cards.length) {
      setSessionDone(true);
    } else {
      setIdx(i => i + 1);
      setFlipped(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center h-64"><Spinner /></div>
    </div>
  );

  if (cards.length === 0) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 mb-4">No flashcards to practice.</p>
        <Link href={`/kits/${id}`}><Button variant="secondary">Back to kit</Button></Link>
      </div>
    </div>
  );

  const card = cards[idx];
  const progress = Math.round(((idx) / cards.length) * 100);

  if (sessionDone) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Session complete!</h2>
        <p className="text-gray-600 mb-4">
          You practiced {cards.length} flashcard{cards.length !== 1 ? 's' : ''}.
        </p>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-green-600">✓ {stats.covered} covered</span>
          <span className="text-gray-400">of {stats.total} total</span>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setIdx(0); setFlipped(false); setSessionDone(false); }}>
            Practice again
          </Button>
          <Link href={`/kits/${id}`}>
            <Button variant="secondary">Back to kit</Button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href={`/kits/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Kit</Link>
          <span className="text-sm text-gray-500">{idx + 1} / {cards.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full mb-6">
          <div
            className="h-1.5 bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Coverage stats */}
        <div className="text-xs text-gray-400 text-center mb-4">
          {stats.covered} of {stats.total} cards practiced this session
        </div>

        {/* Flashcard */}
        <div
          className="cursor-pointer select-none"
          onClick={() => setFlipped(f => !f)}
          onKeyDown={e => e.key === ' ' && setFlipped(f => !f)}
          tabIndex={0}
          role="button"
          aria-label={flipped ? 'Card answer — click to flip back' : 'Card question — click to reveal answer'}
        >
          <Card className={`p-8 min-h-48 flex flex-col items-center justify-center text-center transition-all ${flipped ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
            {!flipped ? (
              <>
                <span className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Question</span>
                <p className="text-lg font-medium text-gray-800">{card.front}</p>
                <p className="text-xs text-gray-400 mt-4">Click or press Space to reveal answer</p>
              </>
            ) : (
              <>
                <span className="text-xs text-indigo-400 mb-3 uppercase tracking-wide">Answer</span>
                <p className="text-base text-gray-700 whitespace-pre-line">{card.back}</p>
              </>
            )}
          </Card>
        </div>

        {/* Confidence buttons — only show after flip */}
        {flipped && (
          <div className="mt-5">
            <p className="text-sm text-gray-500 text-center mb-3">How confident did you feel?</p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3].map(c => (
                <button
                  key={c}
                  onClick={() => handleConfidence(c)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CONFIDENCE_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skip */}
        {!flipped && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { if (idx + 1 >= cards.length) setSessionDone(true); else { setIdx(i => i + 1); setFlipped(false); } }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Skip →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
