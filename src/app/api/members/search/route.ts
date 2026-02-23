import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    const members = (await db.execute({
      sql: `SELECT m.*,
        ms.plan_type, ms.status as membership_status, ms.end_date,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
        AND ms.status = 'active' AND ms.end_date >= date('now')
      WHERE m.first_name LIKE ? OR m.last_name LIKE ? 
        OR m.card_uid LIKE ? OR m.custom_card_id LIKE ?
      ORDER BY m.first_name
      LIMIT 20`,
      args: [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`],
    })).rows;

    return NextResponse.json({ members });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
