'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Navbar from '@/components/kit/Navbar';
import CompanyBrief from '@/components/kit/CompanyBrief';
import QuestionBank from '@/components/kit/QuestionBank';
import FlashcardsSection from '@/components/kit/FlashcardsSection';
import ScheduleSection from '@/components/kit/ScheduleSection';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';

export default function KitPage() {
  const { id } = useParams();
  const router = useRouter();
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('brief');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    api.getKit(id)
      .then(setKit)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function save(updates) {
    setSaving(true);
    try {
      const updated = await api.updateKit(id, updates);
      setKit(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate(section) {
    const updated = await api.regenerateSection(id, section);
    setKit(updated);
  }

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center h-64"><Spinner /></div>
    </div>
  );

  if (error || !kit) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error || 'Kit not found'}</p>
        <Link href="/dashboard"><Button variant="secondary">Back to dashboard</Button></Link>
      </div>
    </div>
  );

  if (kit.status === 'generating') return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">This kit is still being generated. Refresh in a moment.</p>
      </div>
    </div>
  );

  if (kit.status === 'failed') return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-600 font-medium mb-2">Generation failed</p>
        <p className="text-gray-500 text-sm mb-6">{kit.error}</p>
        <Link href="/dashboard"><Button variant="secondary">Back to dashboard</Button></Link>
      </div>
    </div>
  );

  const tabs = [
    { id: 'brief', label: 'Brief' },
    { id: 'role', label: 'Role' },
    { id: 'questions', label: `Questions (${kit.questions?.length || 0})` },
    { id: 'flashcards', label: `Flashcards (${kit.flashcards?.length || 0})` },
    { id: 'schedule', label: 'Schedule' },
  ];

  const uncoveredCount = kit.coverage?.uncovered_requirement_ids?.length || 0;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Kit header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">
                  {kit.role?.title || 'Interview Prep Kit'}
                </h1>
                <Badge variant={kit.status}>{kit.status}</Badge>
              </div>
              <p className="text-sm text-gray-500">
                {kit.source?.company} · {kit.schedule?.days_available} days
                {uncoveredCount > 0 && (
                  <span className="ml-2 text-amber-600">· {uncoveredCount} uncovered req{uncoveredCount !== 1 ? 's' : ''}</span>
                )}
                {uncoveredCount === 0 && <span className="ml-2 text-green-600">· ✓ Full coverage</span>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {saving && <Spinner size="sm" />}
              <Link href={`/kits/${id}/practice`}>
                <Button variant="secondary" size="sm">Practice flashcards</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-4xl mx-auto flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'brief' && (
          <CompanyBrief
            brief={kit.company_brief}
            sources={kit.source?.pages_used}
            onUpdate={brief => save({ company_brief: brief })}
            onRegenerate={handleRegenerate}
          />
        )}

        {activeTab === 'role' && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Breakdown</h2>
            {kit.role?.seniority && (
              <p className="text-sm text-gray-500 mb-3">Seniority: <span className="font-medium text-gray-700">{kit.role.seniority}</span></p>
            )}
            {kit.role?.responsibilities?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Responsibilities</h3>
                <ul className="space-y-1">
                  {kit.role.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-700 mb-2">Requirements</h3>
            <div className="space-y-2">
              {kit.role?.requirements?.map(req => (
                <div key={req.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                  <span className="text-xs text-gray-400 font-mono mt-0.5">{req.id}</span>
                  <span className="text-sm text-gray-700 flex-1">{req.text}</span>
                  <Badge variant={req.priority}>{req.priority}</Badge>
                  <Badge variant={req.kind}>{req.kind}</Badge>
                  {kit.coverage?.uncovered_requirement_ids?.includes(req.id) && (
                    <span className="text-xs text-amber-600">⚠ uncovered</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Coverage passes: {kit.coverage?.passes}</p>
          </Card>
        )}

        {activeTab === 'questions' && (
          <QuestionBank
            questions={kit.questions || []}
            onUpdate={questions => save({ questions })}
            onRegenerate={handleRegenerate}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsSection
            flashcards={kit.flashcards || []}
            onUpdate={flashcards => save({ flashcards })}
            onRegenerate={handleRegenerate}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleSection
            schedule={kit.schedule}
            onRegenerate={handleRegenerate}
          />
        )}
      </main>
    </div>
  );
}
