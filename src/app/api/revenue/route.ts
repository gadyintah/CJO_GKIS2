import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const dailyRevenue = db.prepare(`
      SELECT 
        COALESCE(SUM(p.amount), 0) as membership_revenue,
        COUNT(p.payment_id) as payment_count
      FROM payments p
      WHERE p.payment_date = ?
    `).get(date);

    const walkinRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as walkin_revenue, COUNT(*) as walkin_count
      FROM walkins WHERE payment_date = ?
    `).get(date);

    const monthlyRevenue = db.prepare(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE strftime('%Y-%m', payment_date) = ?
      GROUP BY month
    `).get(month);

    const monthlyWalkins = db.prepare(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount_paid) as total,
        COUNT(*) as count
      FROM walkins
      WHERE strftime('%Y-%m', payment_date) = ?
      GROUP BY month
    `).get(month);

    const payments = db.prepare(`
      SELECT p.*, m.first_name, m.last_name, ms.plan_type
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.member_id
      LEFT JOIN memberships ms ON p.membership_id = ms.membership_id
      ORDER BY p.payment_date DESC
      LIMIT 100
    `).all();

    const monthlyBreakdown = db.prepare(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as total
      FROM payments
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all();

    return NextResponse.json({
      dailyRevenue,
      walkinRevenue,
      monthlyRevenue,
      monthlyWalkins,
      payments,
      monthlyBreakdown
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}
