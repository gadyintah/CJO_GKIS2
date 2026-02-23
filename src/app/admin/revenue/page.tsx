'use client';

import { useEffect, useState, useCallback } from 'react';

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
  totalCount: number;
  page: number;
  totalPages: number;
  monthlyBreakdown: { month: string; total: number }[];
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);

  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    plan_type: '',
    mop: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('date', today);
      params.set('month', month);
      params.set('page', page.toString());
      params.set('limit', '100');
      if (filters.search) params.set('search', filters.search);
      if (filters.from_date) params.set('from_date', filters.from_date);
      if (filters.to_date) params.set('to_date', filters.to_date);
      if (filters.plan_type) params.set('plan_type', filters.plan_type);
      if (filters.mop) params.set('mop', filters.mop);

      const res = await fetch(`/api/revenue?${params}`);
      const json = await res.json();
      setData(json);
      setTotalCount(json.totalCount || 0);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [today, month, filters, page]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

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

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-500 mb-1">Search Member</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input type="date" value={filters.from_date}
              onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input type="date" value={filters.to_date}
              onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Plan Type</label>
            <select value={filters.plan_type}
              onChange={(e) => setFilters(prev => ({ ...prev, plan_type: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">All Plans</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
            <select value={filters.mop}
              onChange={(e) => setFilters(prev => ({ ...prev, mop: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button onClick={() => setFilters({ from_date: '', to_date: '', plan_type: '', mop: '', search: '' })}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">All Payments</h2>
          <span className="text-sm text-gray-400">{totalCount} records</span>
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
              {data.payments.map((p) => (
                <tr key={p.payment_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-sm">{p.payment_date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.first_name} {p.last_name}</td>
                  <td className="px-4 py-3 capitalize text-gray-600 text-sm">{p.plan_type || '-'}</td>
                  <td className="px-4 py-3 font-bold text-green-600">₱{p.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{p.mop}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{p.notes}</td>
                </tr>
              ))}
              {data.payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payments yet</td></tr>
              )}
            </tbody>
          </table>
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
