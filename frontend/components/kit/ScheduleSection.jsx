'use client';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function ScheduleSection({ schedule, onRegenerate }) {
  const [regenerating, setRegen] = useState(false);

  async function handleRegen() {
    setRegen(true);
    try { await onRegenerate('schedule'); }
    finally { setRegen(false); }
  }

  if (!schedule) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Study Schedule <span className="text-gray-400 font-normal text-base">({schedule.days_available} days)</span>
        </h2>
        <Button size="sm" variant="secondary" onClick={handleRegen} loading={regenerating}>
          Regenerate
        </Button>
      </div>

      <div className="space-y-2">
        {schedule.days?.map(day => (
          <div key={day.day} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <div className="shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-700">{day.day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-800 capitalize">{day.focus}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {day.question_ids?.length} question{day.question_ids?.length !== 1 ? 's' : ''} · {day.minutes} min
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
