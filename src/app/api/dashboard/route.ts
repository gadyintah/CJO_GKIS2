import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const checkedInToday = (db.prepare(`
      SELECT COUNT(DISTINCT member_id) as count FROM logs
      WHERE action = 'CHECK_IN' AND date(timestamp) = ?
    `).get(today) as { count: number }).count;

    const walkinsToday = (db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
      FROM walkins WHERE payment_date = ?
    `).get(today) as { count: number; total: number });

    const revenueToday = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE payment_date = ?
    `).get(today) as { total: number }).total;

    const totalRevenue = (revenueToday) + (walkinsToday.total || 0);

    const activeMembers = (db.prepare(`
      SELECT COUNT(*) as count FROM memberships
      WHERE status = 'active' AND end_date >= date('now')
    `).get() as { count: number }).count;

    const expiredMembers = (db.prepare(`
      SELECT COUNT(DISTINCT m.member_id) as count
      FROM members m
      WHERE NOT EXISTS (
        SELECT 1 FROM memberships ms
        WHERE ms.member_id = m.member_id AND ms.status = 'active' AND ms.end_date >= date('now')
      )
    `).get() as { count: number }).count;

    // Weekly attendance (last 7 days)
    const weeklyAttendance = db.prepare(`
      SELECT date(timestamp) as date, COUNT(DISTINCT member_id) as count
      FROM logs WHERE action = 'CHECK_IN'
        AND date(timestamp) >= date('now', '-6 days')
      GROUP BY date(timestamp)
      ORDER BY date
    `).all();

    // Monthly attendance (last 30 days by week)
    const monthlyRevenueSummary = db.prepare(`
      SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total
      FROM payments
      WHERE strftime('%Y-%m', payment_date) >= strftime('%Y-%m', date('now', '-5 months'))
      GROUP BY month ORDER BY month
    `).all();

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT l.*, m.first_name, m.last_name, m.image_path
      FROM logs l
      LEFT JOIN members m ON l.member_id = m.member_id
      ORDER BY l.timestamp DESC LIMIT 10
    `).all();

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
