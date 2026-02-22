import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { addMonths, addYears, toDateString } from '@/lib/dateUtils';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { member_id, plan_type, start_date, amount, mop } = body;

    const now = new Date().toISOString();

    // Expire old active memberships
    db.prepare(`
      UPDATE memberships SET status = 'expired'
      WHERE member_id = ? AND status = 'active'
    `).run(member_id);

    // Calculate end_date
    const start = new Date(start_date || new Date());
    let end: Date;
    let months_purchased = 1;
    if (plan_type === 'yearly') {
      end = addYears(start, 1);
      months_purchased = 12;
    } else {
      end = addMonths(start, 1);
      months_purchased = 1;
    }
    const end_date = toDateString(end);
    const start_date_str = toDateString(start);

    const membershipResult = db.prepare(`
      INSERT INTO memberships (member_id, plan_type, start_date, end_date, months_purchased, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(member_id, plan_type, start_date_str, end_date, months_purchased, now);

    const membership_id = membershipResult.lastInsertRowid;

    if (amount) {
      db.prepare(`
        INSERT INTO payments (member_id, membership_id, amount, mop, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(member_id, membership_id, amount, mop, now.split('T')[0], 'Membership renewal');
    }

    return NextResponse.json({ success: true, membership_id });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to renew membership';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
