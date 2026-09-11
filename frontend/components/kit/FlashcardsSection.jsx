'use client';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EditableField from '@/components/ui/EditableField';

export default function FlashcardsSection({ flashcards, onUpdate, onRegenerate }) {
  const [regenerating, setRegen] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  async function handleRegen() {
    setRegen(true);
    try { await onRegenerate('flashcards'); }
    finally { setRegen(false); }
  }

  function updateCard(updated) {
    onUpdate(flashcards.map(f => f.id === updated.id ? { ...updated, _state: 'edited' } : f));
  }

  function deleteCard(id) {
    onUpdate(flashcards.filter(f => f.id !== id));
  }

  function addCard() {
    if (!newFront.trim()) return;
    onUpdate([...flashcards, {
      id: `f${Date.now()}`,
      front: newFront,
      back: newBack,
      requirement_ids: [],
      _state: 'pinned',
      confidence: 0,
      practiceCount: 0,
    }]);
    setNewFront('');
    setNewBack('');
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Flashcards <span className="text-gray-400 font-normal text-base">({flashcards.length})</span>
        </h2>
        <Button size="sm" variant="secondary" onClick={handleRegen} loading={regenerating}>
          Regenerate
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {flashcards.map(card => (
          <div key={card.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-gray-400">
                {card._state === 'pinned' ? '📌' : card._state === 'edited' ? '✏️' : ''}
                {card.practiceCount > 0 && ` · ${card.practiceCount}× practiced`}
                {card.confidence > 0 && ` · conf ${'★'.repeat(card.confidence)}`}
              </span>
              <button onClick={() => deleteCard(card.id)} className="text-gray-300 hover:text-red-500 text-sm">×</button>
            </div>
            <div className="text-sm font-medium text-gray-800 mb-1">
              <EditableField value={card.front} onSave={v => updateCard({ ...card, front: v })} />
            </div>
            <div className="text-sm text-gray-500 border-t border-dashed border-gray-200 pt-1 mt-1">
              <EditableField value={card.back} onSave={v => updateCard({ ...card, back: v })} multiline />
            </div>
          </div>
        ))}
      </div>

      {flashcards.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No flashcards yet.</p>
      )}

      {/* Add card */}
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <input
          type="text"
          value={newFront}
          onChange={e => setNewFront(e.target.value)}
          placeholder="Front (question/concept)"
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={newBack}
          onChange={e => setNewBack(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCard()}
          placeholder="Back (answer)"
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button size="sm" variant="secondary" onClick={addCard}>Add flashcard</Button>
      </div>
    </Card>
  );
}
