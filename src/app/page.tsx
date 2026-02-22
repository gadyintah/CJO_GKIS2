"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-extrabold text-white tracking-widest uppercase mb-3">
          CJO <span className="text-yellow-400">GYM</span>
        </h1>
        <p className="text-gray-400 text-lg">Membership Management System</p>
      </div>

      {/* Date & Time */}
      <div className="text-center mb-14">
        {now ? (
          <>
            <p className="text-3xl font-bold text-white">{formatTime(now)}</p>
            <p className="text-gray-400 mt-1">{formatDate(now)}</p>
          </>
        ) : (
          <p className="text-gray-600 text-xl">Loading...</p>
        )}
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          href="/kiosk"
          className="group flex flex-col items-center justify-center gap-3 bg-gray-800 hover:bg-yellow-500 border border-gray-700 hover:border-yellow-400 rounded-2xl p-10 transition-all duration-200 shadow-lg"
        >
          <span className="text-5xl">🖥️</span>
          <span className="text-xl font-bold text-white group-hover:text-gray-900">
            Kiosk Mode
          </span>
          <span className="text-sm text-gray-400 group-hover:text-gray-800 text-center">
            Entrance monitor — scanner check-in / check-out
          </span>
        </Link>

        <Link
          href="/admin/dashboard"
          className="group flex flex-col items-center justify-center gap-3 bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 rounded-2xl p-10 transition-all duration-200 shadow-lg"
        >
          <span className="text-5xl">📊</span>
          <span className="text-xl font-bold text-white">Admin Panel</span>
          <span className="text-sm text-gray-400 group-hover:text-blue-100 text-center">
            Front desk — member & revenue management
          </span>
        </Link>
      </div>

      <p className="mt-16 text-gray-600 text-sm">CJO GYM &copy; {new Date().getFullYear()}</p>
    </main>
  );
}
