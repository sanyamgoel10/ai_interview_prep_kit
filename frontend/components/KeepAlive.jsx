'use client';
import { useEffect } from 'react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch(`${BASE}/api/health`).catch(() => {});
    ping();
    const id = setInterval(ping, 10000);
    return () => clearInterval(id);
  }, []);

  return null;
}
