import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const walkins = db.prepare(`
      SELECT * FROM walkins ORDER BY payment_date DESC LIMIT ? OFFSET ?
    `).all(limit, offset);

    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);
    const week = getWeekStart();

    const todayStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE payment_date = ?
    `).get(today) as { count: number; total: number };

    const weekStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE payment_date >= ?
    `).get(week) as { count: number; total: number };

    const monthStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE strftime('%Y-%m', payment_date) = ?
    `).get(month) as { count: number; total: number };

    return NextResponse.json({ walkins, todayStats, weekStats, monthStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch walk-ins' }, { status: 500 });
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { guest_name, amount_paid, payment_date, notes } = body;

    const date = payment_date || new Date().toISOString().split('T')[0];

    const result = db.prepare(`
      INSERT INTO walkins (guest_name, amount_paid, payment_date, notes)
      VALUES (?, ?, ?, ?)
    `).run(guest_name || 'Walk-in Guest', amount_paid || 0, date, notes);

    return NextResponse.json({ success: true, walkin_id: result.lastInsertRowid }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to add walk-in';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
