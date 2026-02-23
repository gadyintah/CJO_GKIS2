import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { card_uid } = body;

    if (!card_uid) {
      return NextResponse.json({ error: 'card_uid required' }, { status: 400 });
    }

    const member = db.prepare(`
      SELECT m.*,
        ms.membership_id, ms.plan_type, ms.status as membership_status,
        ms.start_date, ms.end_date,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
        AND ms.status = 'active' AND ms.end_date >= date('now')
      WHERE m.card_uid = ?
    `).get(card_uid) as Record<string, unknown> | undefined;

    if (!member) {
      return NextResponse.json({ 
        found: false, 
        message: 'Card not registered — Please see the front desk' 
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const today = nowIso.split('T')[0];

    const existingCheckIn = db.prepare(`
      SELECT * FROM logs
      WHERE member_id = ? AND action = 'CHECK_IN'
        AND date(timestamp) = ?
        AND log_id NOT IN (
          SELECT l2.log_id FROM logs l2
          WHERE l2.member_id = ? AND l2.action = 'CHECK_IN'
            AND date(l2.timestamp) = ?
            AND EXISTS (
              SELECT 1 FROM logs l3
              WHERE l3.member_id = ? AND l3.action = 'CHECK_OUT'
                AND l3.timestamp > l2.timestamp
                AND date(l3.timestamp) = ?
            )
        )
      ORDER BY timestamp DESC LIMIT 1
    `).get(member.member_id, today, member.member_id, today, member.member_id, today) as Record<string, unknown> | undefined;

    let action: string;
    let duration_seconds: number | null = null;

    if (!existingCheckIn) {
      action = 'CHECK_IN';
      db.prepare(`
        INSERT INTO logs (member_id, card_uid, action, timestamp, duration_seconds)
        VALUES (?, ?, 'CHECK_IN', ?, NULL)
      `).run(member.member_id, card_uid, nowIso);
    } else {
      action = 'CHECK_OUT';
      const checkInTime = new Date(existingCheckIn.timestamp as string);
      duration_seconds = Math.floor((now.getTime() - checkInTime.getTime()) / 1000);
      db.prepare(`
        INSERT INTO logs (member_id, card_uid, action, timestamp, duration_seconds)
        VALUES (?, ?, 'CHECK_OUT', ?, ?)
      `).run(member.member_id, card_uid, nowIso, duration_seconds);
    }

    const sessionCount = (db.prepare(`
      SELECT COUNT(*) as count FROM logs
      WHERE member_id = ? AND action = 'CHECK_IN' AND date(timestamp) = ?
    `).get(member.member_id, today) as { count: number }).count;

    const hasActiveMembership = !!member.membership_status;

    return NextResponse.json({
      found: true,
      member,
      action,
      duration_seconds,
      session_count_today: sessionCount,
      has_active_membership: hasActiveMembership,
      message: action === 'CHECK_IN' ? 'Welcome! Checked in successfully.' : 'Goodbye! Checked out successfully.',
      timestamp: nowIso
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const card_uid = searchParams.get('card_uid') || '';

    if (!card_uid) {
      return NextResponse.json({ error: 'card_uid required' }, { status: 400 });
    }

    const member = db.prepare(`
      SELECT m.*,
        ms.membership_id, ms.plan_type, ms.status as membership_status,
        ms.start_date, ms.end_date,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
        AND ms.status = 'active' AND ms.end_date >= date('now')
      WHERE m.card_uid = ?
    `).get(card_uid) as Record<string, unknown> | undefined;

    if (!member) {
      return NextResponse.json({ found: false, message: 'Card not registered' });
    }

    return NextResponse.json({ found: true, member });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
