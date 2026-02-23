import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { InValue } from '@libsql/client';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';
    const plan_type = searchParams.get('plan_type') || '';
    const mop = searchParams.get('mop') || '';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '100')));
    const offset = (page - 1) * limit;

    const dailyRevenue = (await db.execute({
      sql: `SELECT 
        COALESCE(SUM(p.amount), 0) as membership_revenue,
        COUNT(p.payment_id) as payment_count
      FROM payments p
      WHERE p.payment_date = ?`,
      args: [date],
    })).rows[0];

    const walkinRevenue = (await db.execute({
      sql: `SELECT COALESCE(SUM(amount_paid), 0) as walkin_revenue, COUNT(*) as walkin_count
      FROM walkins WHERE payment_date = ?`,
      args: [date],
    })).rows[0];

    const monthlyRevenue = (await db.execute({
      sql: `SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE strftime('%Y-%m', payment_date) = ?
      GROUP BY month`,
      args: [month],
    })).rows[0];

    const monthlyWalkins = (await db.execute({
      sql: `SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount_paid) as total,
        COUNT(*) as count
      FROM walkins
      WHERE strftime('%Y-%m', payment_date) = ?
      GROUP BY month`,
      args: [month],
    })).rows[0];

    // Build filtered payments query
    let whereClause = ' WHERE 1=1';
    const filterParams: InValue[] = [];

    if (from_date) {
      whereClause += ` AND p.payment_date >= ?`;
      filterParams.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND p.payment_date <= ?`;
      filterParams.push(to_date);
    }
    if (plan_type) {
      whereClause += ` AND ms.plan_type = ?`;
      filterParams.push(plan_type);
    }
    if (mop) {
      whereClause += ` AND p.mop = ?`;
      filterParams.push(mop);
    }
    if (search) {
      whereClause += ` AND (m.first_name LIKE ? OR m.last_name LIKE ?)`;
      filterParams.push(`%${search}%`, `%${search}%`);
    }

    const paymentsFrom = ` FROM payments p
      LEFT JOIN members m ON p.member_id = m.member_id
      LEFT JOIN memberships ms ON p.membership_id = ms.membership_id`;

    const countResult = (await db.execute({
      sql: `SELECT COUNT(*) as count` + paymentsFrom + whereClause,
      args: filterParams,
    })).rows[0] as unknown as { count: number };
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / limit);

    const payments = (await db.execute({
      sql: `SELECT p.*, m.first_name, m.last_name, ms.plan_type` + paymentsFrom + whereClause + ` ORDER BY p.payment_date DESC LIMIT ? OFFSET ?`,
      args: [...filterParams, limit, offset],
    })).rows;

    const monthlyBreakdown = (await db.execute({
      sql: `SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as total
      FROM payments
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12`,
      args: [],
    })).rows;

    return NextResponse.json({
      dailyRevenue,
      walkinRevenue,
      monthlyRevenue,
      monthlyWalkins,
      payments,
      monthlyBreakdown,
      totalCount,
      page,
      totalPages
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}
