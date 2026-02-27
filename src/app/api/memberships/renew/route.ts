import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { addMonths, addYears, toDateString } from '@/lib/dateUtils';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { member_id, plan_type, start_date, amount, mop, notes: userNotes } = body;

    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];

    // Calculate months and end offset
    let months_purchased = 1;
    if (plan_type === 'yearly') {
      months_purchased = 12;
    }

    // Check for current active membership that has not yet expired
    const activeMembership = (await db.execute({
      sql: `SELECT * FROM memberships
      WHERE member_id = ? AND status = 'active' AND end_date >= ?
      ORDER BY end_date DESC LIMIT 1`,
      args: [member_id, todayStr],
    })).rows[0] as unknown as { membership_id: number; end_date: string; months_purchased: number; plan_type: string } | undefined;

    let membership_id: number;

    if (activeMembership) {
      // Renewed before expiring — extend the current membership
      const currentEnd = new Date(activeMembership.end_date + 'T00:00:00');
      let newEnd: Date;
      if (plan_type === 'yearly') {
        newEnd = addYears(currentEnd, 1);
      } else {
        newEnd = addMonths(currentEnd, 1);
      }
      const new_end_date = toDateString(newEnd);
      const new_months = (activeMembership.months_purchased || 0) + months_purchased;

      await db.execute({
        sql: `UPDATE memberships SET
          end_date = ?, months_purchased = ?, plan_type = ?
        WHERE membership_id = ?`,
        args: [new_end_date, new_months, plan_type, activeMembership.membership_id],
      });

      membership_id = activeMembership.membership_id;

      // Record payment with note about extension
      if (amount) {
        const paymentNotes = userNotes || `Membership extended — end date changed to ${new_end_date}`;
        await db.execute({
          sql: `INSERT INTO payments (member_id, membership_id, amount, mop, payment_date, notes)
          VALUES (?, ?, ?, ?, ?, ?)`,
          args: [member_id, membership_id, amount, mop, todayStr, paymentNotes],
        });
      }
    } else {
      // There is a gap or no active membership — create new membership record
      // Expire any old active memberships
      await db.execute({
        sql: `UPDATE memberships SET status = 'expired'
        WHERE member_id = ? AND status = 'active'`,
        args: [member_id],
      });

      const start = new Date(start_date || new Date());
      let end: Date;
      if (plan_type === 'yearly') {
        end = addYears(start, 1);
      } else {
        end = addMonths(start, 1);
      }
      const end_date = toDateString(end);
      const start_date_str = toDateString(start);

      const membershipResult = await db.execute({
        sql: `INSERT INTO memberships (member_id, plan_type, start_date, end_date, months_purchased, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?)`,
        args: [member_id, plan_type, start_date_str, end_date, months_purchased, now],
      });

      membership_id = Number(membershipResult.lastInsertRowid);

      if (amount) {
        const paymentNotes = userNotes || 'Membership renewal';
        await db.execute({
          sql: `INSERT INTO payments (member_id, membership_id, amount, mop, payment_date, notes)
          VALUES (?, ?, ?, ?, ?, ?)`,
          args: [member_id, membership_id, amount, mop, todayStr, paymentNotes],
        });
      }
    }

    return NextResponse.json({ success: true, membership_id });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to renew membership';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
