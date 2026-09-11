'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, streamKitGeneration } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Navbar from '@/components/kit/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

const STEP_LABELS = {
  start: 'Starting pipeline',
  crawl: 'Crawling company website',
  research: 'Searching public discussion',
  extract: 'Extracting requirements',
  brief: 'Writing company brief',
  questions: 'Generating questions',
  coverage: 'Checking coverage',
  flashcards: 'Creating flashcards',
  schedule: 'Building schedule',
  validate: 'Validating kit',
  done: 'Complete!',
};

export default function NewKitPage() {
  const router = useRouter();
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(7);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState([]);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState(false);
  const [batchFile, setBatchFile] = useState(null);

  useEffect(() => { if (!isLoggedIn()) router.push('/login'); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setProgress([]);
    setGenerating(true);

    try {
      const { kitId } = await api.createKit(jd.trim(), companyUrl.trim(), Number(days));

      await new Promise((resolve, reject) => {
        streamKitGeneration(
          kitId,
          (event) => {
            setCurrentStep(event.step);
            setProgress(prev => [...prev, { ...event, ts: Date.now() }]);
          },
          () => resolve(kitId),
          reject
        );
      });

      router.push(`/kits/${kitId}`);
    } catch (err) {
      setError(err.message || 'Generation failed');
      setGenerating(false);
    }
  }

  async function handleBatchUpload(e) {
    e.preventDefault();
    if (!batchFile) return;
    setError('Please use the batch CLI for file uploads: npm run evaluate --input <file>');
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Interview Prep Kit</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setUploadMode(false)}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${!uploadMode ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
          >
            Single Role
          </button>
          <button
            onClick={() => setUploadMode(true)}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${uploadMode ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
          >
            Batch Upload
          </button>
        </div>

        {generating ? (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Spinner />
              <span className="font-semibold text-gray-800">
                {STEP_LABELS[currentStep] || 'Processing...'}
              </span>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {progress.map((p, i) => (
                <div key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-indigo-400 shrink-0">›</span>
                  <span>{p.message}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : uploadMode ? (
          <Card className="p-6">
            <h2 className="font-semibold mb-3">Batch Upload</h2>
            <p className="text-sm text-gray-600 mb-4">
              For batch processing, use the CLI command:
            </p>
            <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto">
              {`npm run evaluate -- --input cases.json --output kits.json`}
            </pre>
            <p className="text-sm text-gray-500 mt-3">
              Input format: <code className="text-xs bg-gray-100 px-1 rounded">[{`{"id":"1","jd":"...","company_url":"...","days":5}`}]</code>
            </p>
          </Card>
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={10}
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
                <p className="text-xs text-gray-400 mt-1">{jd.length} characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Website <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days until interview <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={365}
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                Generate Kit
              </Button>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}
