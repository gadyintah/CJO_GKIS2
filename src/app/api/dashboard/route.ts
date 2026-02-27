import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    const checkedInToday = ((await db.execute({
      sql: `SELECT COUNT(DISTINCT member_id) as count FROM logs
      WHERE action = 'CHECK_IN' AND date(timestamp) = ?`,
      args: [today],
    })).rows[0] as unknown as { count: number }).count;

    const walkinsToday = (await db.execute({
      sql: `SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE payment_date = ?`,
      args: [today],
    })).rows[0] as unknown as { count: number; total: number };

    const revenueToday = ((await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE payment_date = ?`,
      args: [today],
    })).rows[0] as unknown as { total: number }).total;

    const totalRevenue = (revenueToday) + (walkinsToday.total || 0);

    const activeMembers = ((await db.execute({
      sql: `SELECT COUNT(*) as count FROM memberships
      WHERE status = 'active' AND end_date >= date('now')`,
      args: [],
    })).rows[0] as unknown as { count: number }).count;

    const expiredMembers = ((await db.execute({
      sql: `SELECT COUNT(DISTINCT m.member_id) as count
      FROM members m
      WHERE NOT EXISTS (
        SELECT 1 FROM memberships ms
        WHERE ms.member_id = m.member_id AND ms.status = 'active' AND ms.end_date >= date('now')
      )`,
      args: [],
    })).rows[0] as unknown as { count: number }).count;

    const weeklyAttendance = (await db.execute({
      sql: `SELECT date(timestamp) as date, COUNT(DISTINCT member_id) as count
      FROM logs WHERE action = 'CHECK_IN'
        AND date(timestamp) >= date('now', '-6 days')
      GROUP BY date(timestamp)
      ORDER BY date`,
      args: [],
    })).rows;

    const monthlyRevenueSummary = (await db.execute({
      sql: `SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total
      FROM payments
      WHERE strftime('%Y-%m', payment_date) >= strftime('%Y-%m', date('now', '-5 months'))
      GROUP BY month ORDER BY month`,
      args: [],
    })).rows;

    const recentActivity = (await db.execute({
      sql: `SELECT l.*, m.first_name, m.last_name, m.image_path
      FROM logs l
      LEFT JOIN members m ON l.member_id = m.member_id
      ORDER BY l.timestamp DESC LIMIT 10`,
      args: [],
    })).rows;

    return NextResponse.json({
      checkedInToday,
      walkinsToday: walkinsToday.count,
      walkinRevenue: walkinsToday.total || 0,
      revenueToday: totalRevenue,
      membershipRevenueToday: revenueToday,
      activeMembers,
      expiredMembers,
      weeklyAttendance,
      monthlyRevenueSummary,
      recentActivity
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
