'use client';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EditableField from '@/components/ui/EditableField';

export default function CompanyBrief({ brief, sources, onUpdate, onRegenerate }) {
  const [regenerating, setRegen] = useState(false);
  const [pinned, setPinned] = useState(brief?._state === 'pinned');

  async function handleRegen() {
    if (pinned) return;
    setRegen(true);
    try { await onRegenerate('company_brief'); }
    finally { setRegen(false); }
  }

  if (!brief) return null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Company Brief</h2>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setPinned(p => !p); onUpdate({ ...brief, _state: pinned ? 'generated' : 'pinned' }); }}
            title={pinned ? 'Unpin (allow regeneration)' : 'Pin (prevent regeneration)'}
            className={`text-sm px-2 py-1 rounded ${pinned ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {pinned ? '📌 Pinned' : '📌 Pin'}
          </button>
          <Button size="sm" variant="secondary" onClick={handleRegen} loading={regenerating} disabled={pinned}>
            Regenerate
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Summary</span>
          <p className="mt-1 text-sm text-gray-700">
            <EditableField
              value={brief.summary}
              onSave={v => onUpdate({ ...brief, summary: v, _state: 'edited' })}
              multiline
            />
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">What they do</span>
          <p className="mt-1 text-sm text-gray-700">
            <EditableField
              value={brief.what_they_do}
              onSave={v => onUpdate({ ...brief, what_they_do: v, _state: 'edited' })}
              multiline
            />
          </p>
        </div>
        {brief.interview_process && (
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Interview Process</span>
            <p className="mt-1 text-sm text-gray-700">{brief.interview_process}</p>
          </div>
        )}
        {sources?.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sources</span>
            <ul className="mt-1 space-y-1">
              {sources.map((s, i) => (
                <li key={i} className="text-xs text-indigo-600 truncate">
                  <a href={s} target="_blank" rel="noopener noreferrer">{s}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
