'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import ScannerInput from '@/components/ScannerInput';

interface ScanResult {
  found: boolean;
  member?: {
    member_id: number;
    first_name: string;
    last_name: string;
    image_path?: string;
    plan_type?: string;
    membership_status?: string;
    end_date?: string;
    days_remaining?: number;
  };
  action?: 'CHECK_IN' | 'CHECK_OUT';
  duration_seconds?: number;
  session_count_today?: number;
  has_active_membership?: boolean;
  message?: string;
  timestamp?: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function KioskPage() {
  const [time, setTime] = useState(new Date());
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && scanResult) {
      setScanResult(null);
    }
  }, [countdown, scanResult]);

  const handleScan = useCallback(async (cardUid: string) => {
    if (scanning) return;
    setScanning(true);

    try {
      const response = await fetch('/api/logs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid: cardUid }),
      });
      const data: ScanResult = await response.json();
      setScanResult(data);
      setCountdown(5);
    } catch {
      setScanResult({ found: false, message: 'System error. Please try again.' });
      setCountdown(5);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const dateStr = time.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeStr = time.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      <ScannerInput onScan={handleScan} disabled={scanning} />

      {!scanResult ? (
        /* Default idle screen */
        <div className="text-center z-10 animate-fadeIn">
          {/* Brand */}
          <div className="mb-8">
            <h1 className="text-8xl font-black text-yellow-400 tracking-wider drop-shadow-2xl">
              CJO GYM
            </h1>
            <div className="h-1 bg-yellow-400 rounded-full mt-2 mx-auto w-64" />
          </div>

          {/* Clock */}
          <div className="mb-12">
            <p className="text-5xl font-mono font-bold text-white mb-2">{timeStr}</p>
            <p className="text-xl text-gray-400">{dateStr}</p>
          </div>

          {/* Scan prompt */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 max-w-md mx-auto">
            {scanning ? (
              <div className="text-center">
                <div className="text-6xl mb-4 animate-pulse">⏳</div>
                <p className="text-2xl font-semibold text-yellow-400">Processing...</p>
              </div>
            ) : (
              <>
                <div className="text-6xl mb-4 animate-bounce">📡</div>
                <p className="text-2xl font-semibold text-yellow-400 mb-2">Scan Your Card</p>
                <p className="text-gray-400">Place your membership card near the scanner</p>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Scan result screen */
        <div className="z-10 w-full max-w-2xl mx-auto px-4 animate-fadeIn">
          <div className={`rounded-2xl p-8 border-2 ${
            !scanResult.found 
              ? 'bg-red-950 border-red-500' 
              : scanResult.has_active_membership
                ? scanResult.action === 'CHECK_IN'
                  ? 'bg-green-950 border-green-500'
                  : 'bg-blue-950 border-blue-500'
                : 'bg-orange-950 border-orange-500'
          }`}>
            {!scanResult.found ? (
              /* Card not found */
              <div className="text-center">
                <div className="text-8xl mb-4">❌</div>
                <h2 className="text-3xl font-bold text-red-400 mb-2">Card Not Found</h2>
                <p className="text-xl text-gray-300">{scanResult.message}</p>
              </div>
            ) : (
              /* Member found */
              <div className="flex gap-6 items-start">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {scanResult.member?.image_path ? (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-4 border-yellow-400">
                      <Image
                        src={scanResult.member.image_path}
                        alt="Member photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-gray-700 flex items-center justify-center border-4 border-yellow-400">
                      <span className="text-6xl">👤</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-4xl font-black">
                      {scanResult.member?.first_name} {scanResult.member?.last_name}
                    </h2>
                  </div>

                  {/* Check-in/out badge */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold mb-4 ${
                    scanResult.action === 'CHECK_IN' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-blue-500 text-white'
                  }`}>
                    {scanResult.action === 'CHECK_IN' ? '✅ CHECKED IN' : '👋 CHECKED OUT'}
                  </div>

                  {scanResult.action === 'CHECK_OUT' && scanResult.duration_seconds && (
                    <p className="text-gray-300 mb-2">
                      Session duration: <span className="font-bold text-yellow-400">{formatDuration(scanResult.duration_seconds)}</span>
                    </p>
                  )}

                  {/* Membership status */}
                  {scanResult.has_active_membership ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-green-400 font-semibold">Active Membership</span>
                      </div>
                      <p className="text-gray-300">
                        Plan: <span className="text-yellow-400 font-semibold capitalize">{scanResult.member?.plan_type}</span>
                      </p>
                      <p className="text-gray-300">
                        Days remaining: <span className="text-yellow-400 font-bold text-xl">{scanResult.member?.days_remaining}</span>
                      </p>
                      <p className="text-gray-300">
                        Sessions today: <span className="text-yellow-400 font-bold">{scanResult.session_count_today}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="bg-orange-900 rounded-lg p-3 border border-orange-500">
                      <p className="text-orange-300 font-bold">⚠️ Membership Expired</p>
                      <p className="text-gray-400 text-sm">Please renew at the front desk</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Countdown */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">Returning to main screen in {countdown}s...</p>
              <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-1000"
                  style={{ width: `${(countdown / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Brand in result view */}
          <p className="text-center text-gray-600 mt-4 text-lg font-bold tracking-widest">CJO GYM</p>
        </div>
      )}

      {/* Brand watermark when showing result */}
      {!scanResult && (
        <div className="absolute bottom-6 text-gray-700 text-sm tracking-widest font-bold">
          FITNESS · STRENGTH · COMMUNITY
        </div>
      )}
    </div>
  );
}
