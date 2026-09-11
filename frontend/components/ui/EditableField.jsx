'use client';
import { useState, useRef, useEffect } from 'react';

export default function EditableField({ value, onSave, multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  function handleKey(e) {
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
    if (!multiline && e.key === 'Enter') { e.preventDefault(); commit(); }
  }

  if (editing) {
    const shared = {
      ref,
      value: draft,
      onChange: e => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKey,
      className: `w-full border border-indigo-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`,
    };
    return multiline
      ? <textarea rows={4} {...shared} />
      : <input type="text" {...shared} />;
  }

  return (
    <span
      role="button"
      tabIndex={0}
      title="Click to edit"
      onClick={() => { setDraft(value); setEditing(true); }}
      onKeyDown={e => e.key === 'Enter' && setEditing(true)}
      className={`cursor-text hover:bg-yellow-50 rounded px-1 -mx-1 transition-colors ${className}`}
    >
      {value || <span className="text-gray-400 italic">Click to add...</span>}
    </span>
  );
}
