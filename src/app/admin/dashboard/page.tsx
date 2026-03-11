'use client';

import { useEffect, useState } from 'react';
import StatsCard from '@/components/StatsCard';
import Link from 'next/link';

interface DashboardData {
  checkedInToday: number;
  walkinsToday: number;
  walkinRevenue: number;
  revenueToday: number;
  membershipRevenueToday: number;
  activeMembers: number;
  expiredMembers: number;
  weeklyAttendance: { date: string; count: number }[];
  monthlyRevenueSummary: { month: string; total: number }[];
  recentActivity: {
    log_id: number;
    member_id: number;
    first_name: string;
    last_name: string;
    image_path: string;
    action: string;
    timestamp: string;
    duration_seconds: number;
  }[];
}

function formatDuration(seconds: number): string {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    window.open('/api/members/export', '_blank');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <span>⬇️</span> Export Data
          </button>
          <Link
            href="/admin/members"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <span>⬆️</span> Import Data
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatsCard title="Checked In Today" value={data.checkedInToday} icon="🏋️" color="blue" />
        <StatsCard title="Walk-ins Today" value={data.walkinsToday} icon="🚶" color="purple" />
        <StatsCard title="Revenue Today" value={`₱${(data.revenueToday ?? 0).toLocaleString()}`} icon="💰" color="green" subtitle={`Membership: ₱${(data.membershipRevenueToday ?? 0).toLocaleString()} | Walk-in: ₱${(data.walkinRevenue ?? 0).toLocaleString()}`} />
        <StatsCard title="Active Members" value={data.activeMembers} icon="✅" color="green" />
        <StatsCard title="Expired Members" value={data.expiredMembers} icon="⚠️" color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Weekly Attendance (Last 7 Days)</h2>
          {data.weeklyAttendance.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No attendance data yet</p>
          ) : (
            <div className="space-y-3">
              {data.weeklyAttendance.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-24 flex-shrink-0">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full flex items-center pl-2"
                      style={{ width: `${Math.min(100, (day.count / Math.max(...data.weeklyAttendance.map(d => d.count))) * 100)}%`, minWidth: '2rem' }}
                    >
                      <span className="text-xs text-white font-bold">{day.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Revenue</h2>
          {data.monthlyRevenueSummary.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No revenue data yet</p>
          ) : (
            <div className="space-y-3">
              {data.monthlyRevenueSummary.map((item) => (
                <div key={item.month} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20 flex-shrink-0">{item.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full flex items-center pl-2"
                      style={{ width: `${Math.min(100, (item.total / Math.max(...data.monthlyRevenueSummary.map(d => d.total))) * 100)}%`, minWidth: '4rem' }}
                    >
                      <span className="text-xs text-white font-bold">₱{(item.total ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Recent Activity</h2>
          <Link href="/admin/logs" className="text-blue-500 text-sm hover:underline">View all →</Link>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No activity yet today</p>
        ) : (
          <div className="space-y-2">
            {data.recentActivity.map((log) => (
              <div key={log.log_id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${log.action === 'CHECK_IN' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <span className="font-medium text-gray-800">
                    {log.first_name} {log.last_name}
                  </span>
                  <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${
                    log.action === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {log.action === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                  </span>
                  {log.duration_seconds && (
                    <span className="ml-2 text-gray-400 text-sm">({formatDuration(log.duration_seconds)})</span>
                  )}
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
