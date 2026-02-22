import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const member_id = searchParams.get('member_id') || '';
    const card_uid = searchParams.get('card_uid') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    let query = `
      SELECT l.*, m.first_name, m.last_name, m.image_path
      FROM logs l
      LEFT JOIN members m ON l.member_id = m.member_id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (date) {
      query += ` AND date(l.timestamp) = ?`;
      params.push(date);
    }
    if (from) {
      query += ` AND date(l.timestamp) >= ?`;
      params.push(from);
    }
    if (to) {
      query += ` AND date(l.timestamp) <= ?`;
      params.push(to);
    }
    if (member_id) {
      query += ` AND l.member_id = ?`;
      params.push(member_id);
    }
    if (card_uid) {
      query += ` AND l.card_uid LIKE ?`;
      params.push(`%${card_uid}%`);
    }

    query += ` ORDER BY l.timestamp DESC LIMIT 200`;

    const logs = db.prepare(query).all(...params);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
