'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Navbar from '@/components/kit/Navbar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';

export default function DashboardPage() {
  const router = useRouter();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    api.listKits()
      .then(setKits)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id, e) {
    e.preventDefault();
    if (!confirm('Delete this kit?')) return;
    await api.deleteKit(id);
    setKits(prev => prev.filter(k => k._id !== id));
  }

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center h-64"><Spinner /></div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Kits</h1>
          <Link href="/new"><Button>+ New Kit</Button></Link>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {kits.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No kits yet</h2>
            <p className="text-gray-500 mb-6">Paste a job description to generate your first interview prep kit.</p>
            <Link href="/new"><Button>Create your first kit</Button></Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {kits.map(kit => (
              <Link key={kit._id} href={`/kits/${kit._id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">
                          {kit.source?.role || 'Untitled Role'}
                        </span>
                        <Badge variant={kit.status}>{kit.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {kit.source?.company || kit.source?.company_url}
                      </p>
                      {kit.coverage && (
                        <p className="text-xs text-gray-400 mt-1">
                          {kit.coverage.uncovered_requirement_ids?.length === 0
                            ? '✓ Full coverage'
                            : `${kit.coverage.uncovered_requirement_ids?.length} uncovered requirements`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">
                        {new Date(kit.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDelete(kit._id, e)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Delete kit"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
