'use client';

import { useEffect, useState, useCallback } from 'react';

interface Log {
  log_id: number;
  member_id: number;
  first_name: string;
  last_name: string;
  image_path: string;
  card_uid: string;
  action: string;
  timestamp: string;
  duration_seconds: number;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    card_uid: '',
    from: '',
    to: '',
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.set('date', filters.date);
      if (filters.card_uid) params.set('card_uid', filters.card_uid);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await fetch(`/api/logs?${params}`);
      const json = await res.json();
      setLogs(json.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.date) params.set('date', filters.date);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    window.open(`/api/logs/export?${params}`, '_blank');
  };

  const checkinsToday = logs.filter(l => l.action === 'CHECK_IN').length;
  const checkoutsToday = logs.filter(l => l.action === 'CHECK_OUT').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Attendance Logs</h1>
          <p className="text-gray-500 mt-1">Track member check-ins and check-outs</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
          title="Export attendance logs to Excel"
        >
          <span>⬇️</span> Export Logs
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value, from: '', to: '' }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input type="date" value={filters.from}
              onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value, date: '' }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input type="date" value={filters.to}
              onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value, date: '' }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Card UID / Member</label>
            <input type="text" value={filters.card_uid} placeholder="Search card..."
              onChange={(e) => setFilters(prev => ({ ...prev, card_uid: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <button onClick={() => setFilters({ date: new Date().toISOString().split('T')[0], card_uid: '', from: '', to: '' })}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">
            Reset
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div><p className="text-xs text-gray-500">Check-ins</p><p className="text-2xl font-bold text-green-600">{checkinsToday}</p></div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">👋</span>
          <div><p className="text-xs text-gray-500">Check-outs</p><p className="text-2xl font-bold text-blue-600">{checkoutsToday}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Member</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Card UID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 animate-pulse">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {new Date(log.timestamp).toLocaleString('en-PH')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {log.first_name ? `${log.first_name} ${log.last_name}` : 'Unknown'}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-500">{log.card_uid}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        log.action === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action === 'CHECK_IN' ? '✅ Check In' : '👋 Check Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{formatDuration(log.duration_seconds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
