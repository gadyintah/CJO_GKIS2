'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  card_uid: string;
  custom_card_id: string;
  image_path: string;
  plan_type: string;
  membership_status: string;
  end_date: string;
  days_remaining: number;
  created_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchMembers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchMembers, 300);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Members</h1>
          <p className="text-gray-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''} found</p>
        </div>
        <Link
          href="/admin/members/register"
          className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          + Register Member
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search by name, card UID, or custom ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-64 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <div className="flex gap-2">
          {['all', 'active', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Photo</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Card UID</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Plan</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Status</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">End Date</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Days Left</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 animate-pulse">Loading...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">No members found</td>
                </tr>
              ) : (
                members.map((m) => {
                  const isActive = !!m.membership_status;
                  return (
                    <tr
                      key={m.member_id}
                      className={`border-t border-gray-100 hover:bg-gray-50 ${
                        isActive ? '' : 'bg-red-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        {m.image_path ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image src={m.image_path} alt="photo" fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            👤
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">
                        {m.card_uid || '-'}
                        {m.custom_card_id && <span className="ml-1 text-gray-400 text-xs">({m.custom_card_id})</span>}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{m.plan_type || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{m.end_date || '-'}</td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className={`font-semibold ${m.days_remaining <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                            {m.days_remaining}d
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/admin/members/${m.member_id}`} className="text-blue-500 hover:text-blue-700 text-sm font-medium">View</Link>
                          <Link href={`/admin/members/${m.member_id}/edit`} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Edit</Link>
                          <Link href={`/admin/members/${m.member_id}/renew`} className="text-green-500 hover:text-green-700 text-sm font-medium">Renew</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
