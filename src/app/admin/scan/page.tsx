'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ScannerInput from '@/components/ScannerInput';

interface ScanResult {
  found: boolean;
  member?: {
    member_id: number;
    first_name: string;
    last_name: string;
    contact_no: string;
    card_uid: string;
    custom_card_id: string;
    image_path: string;
    plan_type: string;
    membership_status: string;
    end_date: string;
    days_remaining: number;
  };
  message?: string;
}

export default function ScanPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualUid, setManualUid] = useState('');

  const lookup = useCallback(async (uid: string) => {
    if (!uid.trim()) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/logs/scan?card_uid=${encodeURIComponent(uid.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, message: 'Lookup failed. Please try again.' });
    } finally {
      setScanning(false);
    }
  }, []);

  const handleScan = useCallback((uid: string) => {
    setManualUid(uid);
    lookup(uid);
  }, [lookup]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(manualUid);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Scanner Check</h1>
        <p className="text-gray-500 mt-1">Scan a card to quickly look up member information</p>
      </div>

      <ScannerInput onScan={handleScan} disabled={scanning} />

      {/* Manual search */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-3">📡 Card Scanner</h2>
        <p className="text-yellow-700 text-sm mb-4">Scan a card with the RFID/barcode scanner, or type the UID manually:</p>
        <form onSubmit={handleManualSearch} className="flex gap-3">
          <input
            type="text"
            value={manualUid}
            onChange={(e) => setManualUid(e.target.value)}
            placeholder="Card UID..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="submit"
            disabled={scanning}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-gray-900 font-bold px-6 py-2 rounded-lg transition-colors"
          >
            {scanning ? 'Looking up...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border-2 p-6 ${
          !result.found ? 'bg-red-50 border-red-300' : result.member?.membership_status ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'
        }`}>
          {!result.found ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">❌</div>
              <h2 className="text-xl font-bold text-red-600">Card Not Found</h2>
              <p className="text-gray-600 mt-1">{result.message}</p>
            </div>
          ) : (
            <div className="flex gap-5">
              <div>
                {result.member?.image_path ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-300">
                    <Image src={result.member.image_path} alt="photo" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-200 flex items-center justify-center text-4xl border-2 border-gray-300">👤</div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-black text-gray-800">
                    {result.member?.first_name} {result.member?.last_name}
                  </h2>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    result.member?.membership_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {result.member?.membership_status ? 'Active' : 'Expired'}
                  </span>
                </div>
                <p className="text-gray-500 font-mono text-sm mb-1">Card: {result.member?.card_uid}</p>
                {result.member?.custom_card_id && (
                  <p className="text-gray-400 text-sm mb-2">Custom ID: {result.member.custom_card_id}</p>
                )}
                {result.member?.membership_status ? (
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Plan:</span> <span className="font-semibold capitalize">{result.member.plan_type}</span></p>
                    <p><span className="text-gray-500">Expires:</span> <span className="font-semibold">{result.member.end_date}</span></p>
                    <p><span className="text-gray-500">Days remaining:</span> <span className={`font-bold ${result.member.days_remaining <= 7 ? 'text-orange-500' : 'text-green-600'}`}>{result.member.days_remaining}</span></p>
                  </div>
                ) : (
                  <p className="text-orange-600 font-medium text-sm">⚠️ No active membership</p>
                )}

                <div className="flex gap-3 mt-4">
                  <Link href={`/admin/members/${result.member?.member_id}`}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                    View Profile
                  </Link>
                  <Link href={`/admin/members/${result.member?.member_id}/edit`}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg">
                    Edit
                  </Link>
                  <Link href={`/admin/members/${result.member?.member_id}/renew`}
                    className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg">
                    Renew
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !scanning && (
        <div className="text-center py-16 text-gray-300">
          <div className="text-8xl mb-4">🔍</div>
          <p className="text-xl">Waiting for scan...</p>
        </div>
      )}
    </div>
  );
}
