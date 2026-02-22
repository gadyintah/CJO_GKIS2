'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface MemberData {
  member: {
    member_id: number;
    first_name: string;
    last_name: string;
    end_date?: string;
    membership_status?: string;
    plan_type?: string;
    days_remaining?: number;
  };
}

export default function RenewMembershipPage() {
  const params = useParams();
  const router = useRouter();
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    plan_type: 'monthly',
    start_date: '',
    amount: '',
    mop: 'Cash',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/members/${params.id}`);
        const json = await res.json();
        setMemberData(json);

        // Default start_date: day after current end_date or today
        const m = json.member;
        let startDate = new Date().toISOString().split('T')[0];
        if (m.end_date && m.membership_status) {
          const nextDay = new Date(m.end_date + 'T00:00:00');
          nextDay.setDate(nextDay.getDate() + 1);
          startDate = nextDay.toISOString().split('T')[0];
        }
        setFormData(prev => ({ ...prev, start_date: startDate }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: params.id,
          ...formData,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => router.push(`/admin/members/${params.id}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Renewal failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Loading...</div>;
  if (!memberData) return null;

  const { member } = memberData;
  const isExpired = !member.membership_status;

  // Calculate preview end date safely (clamp month-end overflow)
  function calcEndDate(startStr: string, planType: string): string {
    const [y, m, d] = startStr.split('-').map(Number);
    if (planType === 'yearly') {
      const endYear = y + 1;
      const lastDay = new Date(endYear, m, 0).getDate();
      return `${endYear}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
    }
    const targetMonth = m + 1; // next month (1-indexed)
    const lastDay = new Date(y, targetMonth, 0).getDate();
    const endM = targetMonth > 12 ? 1 : targetMonth;
    const endY = targetMonth > 12 ? y + 1 : y;
    return `${endY}-${String(endM).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
  }
  const calculatedEnd = formData.start_date ? calcEndDate(formData.start_date, formData.plan_type) : '';

  if (success) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600">Membership Renewed!</h2>
          <p className="text-gray-500 mt-2">Redirecting to member profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Renew Membership</h1>
        <p className="text-gray-500 mt-1">{member.first_name} {member.last_name}</p>
      </div>

      {/* Current status */}
      <div className={`mb-6 p-4 rounded-xl border-2 ${isExpired ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
        <p className="font-semibold text-gray-700">Current Status</p>
        {isExpired ? (
          <p className="text-red-600">⚠️ Membership Expired</p>
        ) : (
          <>
            <p className="text-green-600">✅ Active — <span className="capitalize">{member.plan_type}</span></p>
            <p className="text-gray-600 text-sm">Expires: {member.end_date} ({member.days_remaining} days remaining)</p>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Plan Type *</label>
          <select name="plan_type" value={formData.plan_type} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="monthly">Monthly (1 month)</option>
            <option value="yearly">Yearly (12 months)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
          📅 New membership will end: <strong>{calculatedEnd}</strong>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₱)</label>
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} step="0.01" min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method of Payment</label>
          <select name="mop" value={formData.mop} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
            <option value="Maya">Maya</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={saving}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-gray-900 font-bold py-4 rounded-xl transition-colors">
            {saving ? 'Processing...' : 'Confirm Renewal'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-8 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
