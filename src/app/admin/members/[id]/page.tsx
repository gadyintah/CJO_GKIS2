'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface MemberData {
  member: {
    member_id: number;
    first_name: string;
    last_name: string;
    contact_no: string;
    address: string;
    birthdate: string;
    emergency_contact: string;
    card_uid: string;
    custom_card_id: string;
    image_path: string;
    created_at: string;
    plan_type: string;
    membership_status: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
  };
  memberships: {
    membership_id: number;
    plan_type: string;
    status: string;
    start_date: string;
    end_date: string;
    months_purchased: number;
    created_at: string;
  }[];
  payments: {
    payment_id: number;
    amount: number;
    mop: string;
    payment_date: string;
    notes: string;
    plan_type: string;
  }[];
  logs: {
    log_id: number;
    action: string;
    timestamp: string;
    duration_seconds: number;
  }[];
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

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/members/${params.id}`);
        const json = await res.json();
        if (json.error) { router.push('/admin/members'); return; }
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Loading member details...</div>;
  if (!data) return null;

  const { member, memberships, payments, logs } = data;
  const isActive = !!member.membership_status;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-6 mb-8">
        <div>
          {member.image_path ? (
            <div className="relative w-28 h-28 rounded-xl overflow-hidden border-4 border-yellow-400">
              <Image src={member.image_path} alt="photo" fill className="object-cover" />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-xl bg-gray-200 flex items-center justify-center text-5xl border-4 border-gray-300">
              👤
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl font-black text-gray-800">{member.first_name} {member.last_name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isActive ? 'Active' : 'Expired'}
            </span>
          </div>
          <p className="text-gray-500 font-mono">Card: {member.card_uid || 'No card'}</p>
          {member.custom_card_id && <p className="text-gray-400 text-sm">Custom ID: {member.custom_card_id}</p>}
          {isActive && (
            <p className="text-sm mt-1">
              <span className="text-gray-500">Plan: </span>
              <span className="font-semibold capitalize">{member.plan_type}</span>
              <span className="text-gray-500 ml-3">Expires: </span>
              <span className="font-semibold">{member.end_date}</span>
              <span className={`ml-2 font-bold ${member.days_remaining <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                ({member.days_remaining} days left)
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/admin/members/${member.member_id}/edit`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg"
          >
            Edit
          </Link>
          <Link
            href={`/admin/members/${member.member_id}/renew`}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-5 py-2 rounded-lg"
          >
            Renew
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {['overview', 'memberships', 'payments', 'attendance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg capitalize font-medium transition-colors ${
              activeTab === tab ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow p-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Personal Information</h3>
            <dl className="space-y-2">
              <div><dt className="text-sm text-gray-500">Full Name</dt><dd className="font-medium">{member.first_name} {member.last_name}</dd></div>
              <div><dt className="text-sm text-gray-500">Contact</dt><dd>{member.contact_no || '-'}</dd></div>
              <div><dt className="text-sm text-gray-500">Birthdate</dt><dd>{member.birthdate || '-'}</dd></div>
              <div><dt className="text-sm text-gray-500">Address</dt><dd>{member.address || '-'}</dd></div>
              <div><dt className="text-sm text-gray-500">Emergency Contact</dt><dd>{member.emergency_contact || '-'}</dd></div>
            </dl>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Membership Summary</h3>
            <dl className="space-y-2">
              <div><dt className="text-sm text-gray-500">Status</dt><dd className={`font-bold ${isActive ? 'text-green-600' : 'text-red-600'}`}>{isActive ? 'Active' : 'Expired/None'}</dd></div>
              {isActive && <>
                <div><dt className="text-sm text-gray-500">Plan</dt><dd className="capitalize font-medium">{member.plan_type}</dd></div>
                <div><dt className="text-sm text-gray-500">Start Date</dt><dd>{member.start_date}</dd></div>
                <div><dt className="text-sm text-gray-500">End Date</dt><dd>{member.end_date}</dd></div>
                <div><dt className="text-sm text-gray-500">Days Remaining</dt><dd className="font-bold">{member.days_remaining}</dd></div>
              </>}
              <div><dt className="text-sm text-gray-500">Member Since</dt><dd>{member.created_at?.split('T')[0]}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'memberships' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Start</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">End</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Months</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((ms) => (
                <tr key={ms.membership_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 capitalize font-medium">{ms.plan_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ms.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {ms.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{ms.start_date}</td>
                  <td className="px-4 py-3 text-gray-600">{ms.end_date}</td>
                  <td className="px-4 py-3 text-gray-600">{ms.months_purchased}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Method</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.payment_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{p.payment_date}</td>
                  <td className="px-4 py-3 font-bold text-green-600">₱{p.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{p.mop}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{p.plan_type || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(log.timestamp).toLocaleString('en-PH')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      log.action === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.action === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDuration(log.duration_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
