'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      // success: navigate to admin dashboard
      onClose();
      router.push('/admin/dashboard');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <form onSubmit={submit} className="relative bg-white text-black rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <h3 className="text-2xl font-bold mb-4">Admin Login</h3>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <label className="block mb-2 text-sm">Username
          <input required value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />
        </label>

        <label className="block mb-4 text-sm">Password
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded" />
        </label>

        <div className="flex items-center justify-between gap-2">
          <button type="submit" disabled={loading} className="bg-yellow-500 text-black px-4 py-2 rounded font-semibold">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <button type="button" onClick={onClose} className="text-sm text-gray-600">Cancel</button>
        </div>
      </form>
    </div>
  );
}
