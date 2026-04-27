'use client';

import { useEffect, useState } from 'react';

interface RevenueData {
  dailyRevenue: { membership_revenue: number; payment_count: number };
  walkinRevenue: { walkin_revenue: number; walkin_count: number };
  monthlyRevenue: { month: string; total: number; count: number } | null;
  monthlyWalkins: { month: string; total: number; count: number } | null;
  payments: {
    payment_id: number;
    first_name: string;
    last_name: string;
    amount: number;
    mop: string;
    payment_date: string;
    notes: string;
    plan_type: string;
  }[];
  monthlyBreakdown: { month: string; total: number }[];
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'walkins'>('all');
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/revenue?date=${today}&month=${month}`);
        if (!res.ok) throw new Error('Failed to fetch revenue data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [today, month]);

  const handleExport = () => {
    window.open(`/api/revenue/export?month=${month}`, '_blank');
  };

  const handleExportAll = () => {
    window.open('/api/revenue/export', '_blank');
  };

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Loading revenue data...</div>;
  if (!data) return null;

  const totalDaily = (data.dailyRevenue?.membership_revenue || 0) + (data.walkinRevenue?.walkin_revenue || 0);
  const totalMonthly = (data.monthlyRevenue?.total || 0) + (data.monthlyWalkins?.total || 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Revenue & Payments</h1>
          <p className="text-gray-500 mt-1">Financial overview</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
            title="Export current month revenue to Excel"
          >
            <span>⬇️</span> Export Month
          </button>
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
            title="Export all revenue data to Excel"
          >
            <span>⬇️</span> Export All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Total Today</p>
          <p className="text-3xl font-bold text-gray-800">₱{totalDaily.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Membership Revenue Today</p>
          <p className="text-3xl font-bold text-blue-600">₱{(data.dailyRevenue?.membership_revenue || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400">{data.dailyRevenue?.payment_count || 0} payments</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Walk-in Revenue Today</p>
          <p className="text-3xl font-bold text-purple-600">₱{(data.walkinRevenue?.walkin_revenue || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400">{data.walkinRevenue?.walkin_count || 0} walk-ins</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-500">Total This Month</p>
          <p className="text-3xl font-bold text-green-600">₱{totalMonthly.toLocaleString()}</p>
        </div>
      </div>

      {data.monthlyBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Membership Revenue</h2>
          <div className="space-y-3">
            {data.monthlyBreakdown.map((item) => (
              <div key={item.month} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-20">{item.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full flex items-center pl-3"
                    style={{
                      width: `${Math.min(100, (item.total / Math.max(...data.monthlyBreakdown.map(d => d.total))) * 100)}%`,
                      minWidth: '5rem'
                    }}
                  >
                    <span className="text-xs text-white font-bold">₱{item.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-700">Payments</h2>
            <div className="bg-gray-50 rounded-full p-1 flex items-center text-sm">
              <button
                onClick={() => setTab('all')}
                className={`px-3 py-1 rounded-full ${tab === 'all' ? 'bg-yellow-500 text-white' : 'text-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setTab('walkins')}
                className={`ml-1 px-3 py-1 rounded-full ${tab === 'walkins' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}
              >
                Walk-ins
              </button>
            </div>
          </div>
          <span className="text-sm text-gray-400">{data.payments.length} records</span>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Member</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Method</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const isWalkin = (p: any) => (p.plan_type === 'Walk-in' || p.mop === 'Walk-in');
                const displayed = tab === 'all' ? data.payments : data.payments.filter(isWalkin);
                return displayed.map((p) => {
                const isWalkin = (p.plan_type === 'Walk-in' || p.mop === 'Walk-in');
                return (
                <tr key={p.payment_id} className={`border-t border-gray-100 hover:bg-gray-50 ${isWalkin ? 'bg-purple-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-600 text-sm">{p.payment_date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-3">
                    {isWalkin && <span className="inline-block w-2 h-8 bg-purple-400 rounded-sm" />}
                    <span>{p.first_name} {p.last_name}</span>
                    {isWalkin && <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">Walk-in</span>}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600 text-sm">{p.plan_type || '-'}</td>
                  <td className="px-4 py-3 font-bold text-green-600">₱{p.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{p.mop}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{p.notes}</td>
                </tr>
                );
              });
            })()}
              {data.payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
