import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { InValue } from '@libsql/client';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const member_id = searchParams.get('member_id') || '';
    const card_uid = searchParams.get('card_uid') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '100')));
    const offset = (page - 1) * limit;

    let whereClause = ` WHERE 1=1`;
    const params: InValue[] = [];

    if (date) {
      whereClause += ` AND date(l.timestamp) = ?`;
      params.push(date);
    }
    if (from) {
      whereClause += ` AND date(l.timestamp) >= ?`;
      params.push(from);
    }
    if (to) {
      whereClause += ` AND date(l.timestamp) <= ?`;
      params.push(to);
    }
    if (member_id) {
      whereClause += ` AND l.member_id = ?`;
      params.push(member_id);
    }
    if (card_uid) {
      whereClause += ` AND l.card_uid LIKE ?`;
      params.push(`%${card_uid}%`);
    }

    const countResult = (await db.execute({
      sql: `SELECT COUNT(*) as count FROM logs l LEFT JOIN members m ON l.member_id = m.member_id` + whereClause,
      args: params,
    })).rows[0] as unknown as { count: number };
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / limit);

    const logs = (await db.execute({
      sql: `SELECT l.*, m.first_name, m.last_name, m.image_path
      FROM logs l
      LEFT JOIN members m ON l.member_id = m.member_id` + whereClause + ` ORDER BY l.timestamp DESC LIMIT ? OFFSET ?`,
      args: [...params, limit, offset],
    })).rows;

    return NextResponse.json({ logs, totalCount, page, totalPages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
