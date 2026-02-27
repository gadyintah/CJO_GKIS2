'use client';

import { useEffect, useState, useCallback } from 'react';

interface Walkin {
  walkin_id: number;
  guest_name: string;
  amount_paid: number;
  payment_date: string;
  notes: string;
}

interface WalkinsData {
  walkins: Walkin[];
  todayStats: { count: number; total: number };
  weekStats: { count: number; total: number };
  monthStats: { count: number; total: number };
}

export default function WalkinsPage() {
  const [data, setData] = useState<WalkinsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ guest_name: '', amount_paid: '', notes: '', mop: 'Cash' });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '100');
      const res = await fetch(`/api/walkins?${params}`);
      const json = await res.json();
      setData(json);
      setTotalCount(json.totalCount || 0);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/walkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount_paid: parseFloat(form.amount_paid) || 0 }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setForm({ guest_name: '', amount_paid: '', notes: '', mop: 'Cash' });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add walk-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Walk-in Guests</h1>
        <p className="text-gray-500 mt-1">Track daily walk-in visitors — {totalCount} total</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Today's Walk-ins", count: data?.todayStats.count || 0, total: data?.todayStats.total || 0, color: 'bg-blue-500' },
          { label: "This Week", count: data?.weekStats.count || 0, total: data?.weekStats.total || 0, color: 'bg-purple-500' },
          { label: "This Month", count: data?.monthStats.count || 0, total: data?.monthStats.total || 0, color: 'bg-green-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <div className={`${stat.color} text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl`}>🚶</div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-800">{stat.count}</p>
              <p className="text-sm text-green-600 font-medium">₱{stat.total.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Register Walk-in</h2>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name (optional)</label>
              <input type="text" name="guest_name" value={form.guest_name} onChange={handleChange}
                placeholder="Walk-in Guest"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₱) *</label>
              <input type="number" name="amount_paid" value={form.amount_paid} onChange={handleChange}
                step="0.01" min="0" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select name="mop" value={form.mop} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" name="notes" value={form.notes} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-gray-900 font-bold py-3 rounded-xl transition-colors">
              {submitting ? 'Adding...' : 'Add Walk-in'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-700">Walk-in Log</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 animate-pulse">Loading...</div>
          ) : (
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.walkins.map((w) => (
                    <tr key={w.walkin_id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 text-sm">{w.payment_date}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{w.guest_name || 'Walk-in Guest'}</td>
                      <td className="px-4 py-3 text-green-600 font-bold">₱{w.amount_paid?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!data?.walkins || data.walkins.length === 0) && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No walk-ins yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | string)[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              typeof p === 'string' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    page === p ? 'bg-yellow-500 text-gray-900' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
