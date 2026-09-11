'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function Home() {
  const router = useRouter();
  useEffect(() => { if (isLoggedIn()) router.push('/dashboard'); }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Interview Prep Kit</h1>
        <p className="text-lg text-gray-600 mb-8">
          Paste a job description, give us the company URL, and we'll build you a personalised
          interview kit — questions, flashcards, and a day-by-day study plan.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/register">
            <Button size="lg">Get started free</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">Sign in</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
