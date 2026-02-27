'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface MemberInfo {
  member_id: number;
  first_name: string;
  last_name: string;
  membership_status: string;
  plan_type: string;
  end_date: string;
  days_remaining: number;
}

export default function RenewMemberPage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const [formData, setFormData] = useState({
    plan_type: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    amount: '',
    mop: 'Cash',
    notes: '',
  });

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await fetch(`/api/members/${params.id}`);
        const json = await res.json();
        if (json.error) { router.push('/admin/members'); return; }
        setMember(json.member);
      } catch (err) {
        console.error(err);
        setError('Failed to load member data');
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [params.id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/memberships/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.member_id,
          ...formData,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSuccess(true);
      setResultMsg('Membership renewed successfully!');
      setTimeout(() => router.push(`/admin/members/${member.member_id}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Renewal failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Loading member data...</div>;
  if (!member) return null;

  const isActive = !!member.membership_status;

  if (success) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600">{resultMsg}</h2>
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
      <div className={`mb-6 p-4 rounded-xl border-2 ${isActive ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <h3 className="font-semibold text-gray-700 mb-2">Current Membership</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Status: </span>
            <span className={`font-bold ${isActive ? 'text-green-600' : 'text-red-600'}`}>
              {isActive ? 'Active' : 'Expired / None'}
            </span>
          </div>
          {isActive && (
            <>
              <div><span className="text-gray-500">Plan: </span><span className="font-medium capitalize">{member.plan_type}</span></div>
              <div><span className="text-gray-500">Expires: </span><span className="font-medium">{member.end_date}</span></div>
              <div><span className="text-gray-500">Days Left: </span><span className="font-bold">{member.days_remaining}</span></div>
            </>
          )}
        </div>
        {isActive && (
          <p className="mt-2 text-xs text-gray-500">
            Since the membership is still active, renewing will extend the current end date.
          </p>
        )}
        {!isActive && (
          <p className="mt-2 text-xs text-gray-500">
            A new membership record will be created starting from the selected date.
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">💳 Renewal Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type *</label>
              <select name="plan_type" value={formData.plan_type} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              {isActive && (
                <p className="text-xs text-gray-400 mt-1">Start date is used only if membership has already expired.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₱)</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange}
                step="0.01" min="0"
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
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Comments</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange}
              rows={3} placeholder="Any notes about this renewal..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={submitting}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-gray-900 font-bold py-4 rounded-xl text-lg transition-colors">
            {submitting ? 'Processing...' : 'Renew Membership'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-8 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
