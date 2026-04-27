import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // Daily revenue
    const dailyPayments = await prisma.payment.findMany({
      where: { payment_date: date },
      select: { amount: true },
    });
    const membership_revenue = dailyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const dailyRevenue = { membership_revenue, payment_count: dailyPayments.length };

    // Daily walk-in revenue
    const dailyWalkins = await prisma.walkin.findMany({
      where: { payment_date: date },
      select: { amount_paid: true },
    });
    const walkin_revenue = dailyWalkins.reduce((sum, w) => sum + (w.amount_paid || 0), 0);
    const walkinRevenue = { walkin_revenue, walkin_count: dailyWalkins.length };

    // Monthly revenue
    const monthlyPayments = await prisma.payment.findMany({
      where: { payment_date: { startsWith: month } },
      select: { amount: true },
    });
    const monthlyTotal = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const monthlyRevenue = monthlyPayments.length > 0
      ? { month, total: monthlyTotal, count: monthlyPayments.length }
      : null;

    // Monthly walk-ins
    const monthlyWalkinsList = await prisma.walkin.findMany({
      where: { payment_date: { startsWith: month } },
      select: { amount_paid: true },
    });
    const monthlyWalkinsTotal = monthlyWalkinsList.reduce((sum, w) => sum + (w.amount_paid || 0), 0);
    const monthlyWalkins = monthlyWalkinsList.length > 0
      ? { month, total: monthlyWalkinsTotal, count: monthlyWalkinsList.length }
      : null;

    // Recent payments with member info (membership payments)
    const paymentRows = await prisma.payment.findMany({
      include: {
        member: { select: { first_name: true, last_name: true } },
        membership: { select: { plan_type: true } },
      },
      orderBy: { payment_date: 'desc' },
      take: 100,
    });
    const membershipPayments = paymentRows.map((p) => {
      const { member, membership, ...rest } = p;
      return {
        ...rest,
        first_name: member?.first_name ?? null,
        last_name: member?.last_name ?? null,
        plan_type: membership?.plan_type ?? null,
      };
    });

    // Recent walk-in payments
    const walkinRows = await prisma.walkin.findMany({
      orderBy: { payment_date: 'desc' },
      take: 100,
    });
    const walkinPayments = walkinRows.map((w) => ({
      // use negative id to avoid collision with membership payment ids
      payment_id: -(w.walkin_id),
      first_name: w.guest_name ?? 'Walk-in',
      last_name: '',
      amount: w.amount_paid ?? 0,
      mop: 'Walk-in',
      payment_date: w.payment_date,
      notes: w.notes,
      plan_type: 'Walk-in',
    }));

    // Combine and sort by date desc, limit to 100
    const combined = [...membershipPayments, ...walkinPayments].sort((a, b) => {
      const da = a.payment_date || '';
      const db = b.payment_date || '';
      return db.localeCompare(da);
    }).slice(0, 100);
    const payments = combined;

    // Monthly breakdown (last 12 months)
    // Monthly breakdown should include both membership payments and walkins
    const allPaymentsForBreakdown = [] as { payment_date: string | null; amount: number | null }[];
    const membForBreakdown = await prisma.payment.findMany({
      where: { payment_date: { not: null } },
      select: { payment_date: true, amount: true },
    });
    const walkinForBreakdown = await prisma.walkin.findMany({
      where: { payment_date: { not: null } },
      select: { payment_date: true, amount_paid: true },
    });
    allPaymentsForBreakdown.push(...membForBreakdown.map(p => ({ payment_date: p.payment_date, amount: p.amount })));
    allPaymentsForBreakdown.push(...walkinForBreakdown.map(w => ({ payment_date: w.payment_date, amount: w.amount_paid })));
    const breakdownMap = new Map<string, number>();
    allPaymentsForBreakdown.forEach((p) => {
      if (p.payment_date && p.amount) {
        const m = p.payment_date.substring(0, 7);
        breakdownMap.set(m, (breakdownMap.get(m) || 0) + p.amount);
      }
    });
    const monthlyBreakdown = Array.from(breakdownMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);

    return NextResponse.json({
      dailyRevenue,
      walkinRevenue,
      monthlyRevenue,
      monthlyWalkins,
      payments,
      monthlyBreakdown,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}
