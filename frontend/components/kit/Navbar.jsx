'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuth, getUser } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  function logout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold text-indigo-600">
          🎯 Interview Prep Kit
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
          <Link href="/new">
            <Button size="sm">+ New Kit</Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      </div>
    </nav>
  );
}
