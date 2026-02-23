import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '100')));
    const offset = (page - 1) * limit;

    const walkins = (await db.execute({
      sql: `SELECT * FROM walkins ORDER BY payment_date DESC LIMIT ? OFFSET ?`,
      args: [limit, offset],
    })).rows;

    const countResult = (await db.execute({
      sql: `SELECT COUNT(*) as count FROM walkins`,
      args: [],
    })).rows[0] as unknown as { count: number };
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / limit);

    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);
    const week = getWeekStart();

    const todayStats = (await db.execute({
      sql: `SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE payment_date = ?`,
      args: [today],
    })).rows[0] as unknown as { count: number; total: number };

    const weekStats = (await db.execute({
      sql: `SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE payment_date >= ?`,
      args: [week],
    })).rows[0] as unknown as { count: number; total: number };

    const monthStats = (await db.execute({
      sql: `SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE strftime('%Y-%m', payment_date) = ?`,
      args: [month],
    })).rows[0] as unknown as { count: number; total: number };

    return NextResponse.json({ walkins, todayStats, weekStats, monthStats, totalCount, page, totalPages });
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
    const db = await getDb();
    const body = await request.json();
    const { guest_name, amount_paid, payment_date, notes } = body;

    const date = payment_date || new Date().toISOString().split('T')[0];

    const result = await db.execute({
      sql: `INSERT INTO walkins (guest_name, amount_paid, payment_date, notes)
      VALUES (?, ?, ?, ?)`,
      args: [guest_name || 'Walk-in Guest', amount_paid || 0, date, notes],
    });

    return NextResponse.json({ success: true, walkin_id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to add walk-in';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
