'use client';
import { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EditableField from '@/components/ui/EditableField';
import Card from '@/components/ui/Card';

const CATEGORIES = ['technical', 'behavioural', 'system-design', 'company-fit'];

function SortableQuestion({ q, onUpdate, onDelete, onPin }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-lg bg-white">
      <div className="flex items-start gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mt-0.5 shrink-0"
          title="Drag to reorder"
        >
          ⠿
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={q.category}>{q.category}</Badge>
            <Badge variant={q.difficulty === 3 ? 'must' : q.difficulty === 2 ? 'behavioural' : 'domain'}>
              {'★'.repeat(q.difficulty)}
            </Badge>
            {q._state === 'pinned' && <span className="text-xs text-amber-600">📌 pinned</span>}
            {q._state === 'edited' && <span className="text-xs text-blue-600">✏️ edited</span>}
          </div>
          <div className="text-sm font-medium text-gray-800">
            <EditableField
              value={q.prompt}
              onSave={v => onUpdate({ ...q, prompt: v, _state: 'edited' })}
            />
          </div>
          {expanded && (
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
              <div className="font-medium text-xs text-gray-400 mb-1">Answer outline</div>
              <EditableField
                value={q.answer_outline}
                onSave={v => onUpdate({ ...q, answer_outline: v, _state: 'edited' })}
                multiline
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={() => onPin(q)}
            className={`text-xs px-1.5 py-1 rounded ${q._state === 'pinned' ? 'text-amber-600' : 'text-gray-300 hover:text-amber-500'}`}
            title={q._state === 'pinned' ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
          <button
            onClick={() => onDelete(q.id)}
            className="text-xs text-gray-300 hover:text-red-500 px-1.5 py-1 rounded"
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuestionBank({ questions, onUpdate, onRegenerate }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [regenerating, setRegen] = useState(null);
  const [addingCategory, setAddingCategory] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const filtered = activeCategory === 'all'
    ? questions
    : questions.filter(q => q.category === activeCategory);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex(q => q.id === active.id);
    const newIdx = questions.findIndex(q => q.id === over.id);
    onUpdate(arrayMove(questions, oldIdx, newIdx));
  }

  function updateQuestion(updated) {
    onUpdate(questions.map(q => q.id === updated.id ? updated : q));
  }

  function deleteQuestion(id) {
    if (!confirm('Delete this question?')) return;
    onUpdate(questions.filter(q => q.id !== id));
  }

  function pinQuestion(q) {
    updateQuestion({ ...q, _state: q._state === 'pinned' ? 'generated' : 'pinned' });
  }

  async function handleRegen(category) {
    setRegen(category);
    try { await onRegenerate(`questions_${category}`); }
    finally { setRegen(null); }
  }

  function addQuestion() {
    if (!newPrompt.trim()) return;
    const cat = addingCategory || 'technical';
    const newQ = {
      id: `q${Date.now()}`,
      requirement_ids: [],
      category: cat,
      prompt: newPrompt,
      answer_outline: '',
      difficulty: 2,
      _state: 'pinned',
    };
    onUpdate([...questions, newQ]);
    setNewPrompt('');
    setAddingCategory('');
  }

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = questions.filter(q => q.category === c).length;
    return acc;
  }, {});

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Questions <span className="text-gray-400 font-normal text-base">({questions.length})</span>
        </h2>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 text-xs rounded-full font-medium ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({questions.length})
        </button>
        {CATEGORIES.map(cat => (
          <div key={cat} className="flex items-center gap-1">
            <button
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat} ({counts[cat]})
            </button>
            <button
              onClick={() => handleRegen(cat)}
              disabled={regenerating === cat}
              className="text-xs text-gray-400 hover:text-indigo-600 px-1"
              title={`Regenerate ${cat} questions`}
            >
              {regenerating === cat ? '⟳' : '↺'}
            </button>
          </div>
        ))}
      </div>

      {/* Questions list */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filtered.map(q => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {filtered.map(q => (
              <SortableQuestion
                key={q.id}
                q={q}
                onUpdate={updateQuestion}
                onDelete={deleteQuestion}
                onPin={pinQuestion}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">No questions in this category.</p>
      )}

      {/* Add question */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          <select
            value={addingCategory}
            onChange={e => setAddingCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="text"
            value={newPrompt}
            onChange={e => setNewPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addQuestion()}
            placeholder="Add a question..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Button size="sm" variant="secondary" onClick={addQuestion}>Add</Button>
        </div>
      </div>
    </Card>
  );
}
