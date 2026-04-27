import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const checkedInTodayGroups = await prisma.log.groupBy({
      by: ['member_id'],
      where: { action: 'CHECK_IN', timestamp: { startsWith: today } },
    });
    const checkedInToday = checkedInTodayGroups.length;

    const walkinsTodayList = await prisma.walkin.findMany({
      where: { payment_date: today },
    });
    const walkinsCount = walkinsTodayList.length;
    const walkinTotal = walkinsTodayList.reduce((sum, w) => sum + (w.amount_paid || 0), 0);

    const revenueTodayAgg = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { payment_date: today },
    });
    const revenueToday = revenueTodayAgg._sum.amount || 0;

    const totalRevenue = revenueToday + walkinTotal;

    const activeMembers = await prisma.membership.count({
      where: { status: 'active', end_date: { gte: today } },
    });

    const totalMembers = await prisma.member.count();
    const membersWithActive = await prisma.member.count({
      where: {
        memberships: {
          some: { status: 'active', end_date: { gte: today } },
        },
      },
    });
    const expiredMembers = totalMembers - membersWithActive;

    // Weekly attendance: last 7 days
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const sixDaysAgoStr = sixDaysAgo.toISOString().split('T')[0];

    const weeklyLogs = await prisma.log.findMany({
      where: { action: 'CHECK_IN', timestamp: { gte: sixDaysAgoStr } },
      select: { timestamp: true, member_id: true },
    });

    const weeklyMap = new Map<string, Set<number>>();
    weeklyLogs.forEach((log) => {
      if (log.timestamp && log.member_id) {
        const date = log.timestamp.split('T')[0];
        if (!weeklyMap.has(date)) weeklyMap.set(date, new Set());
        weeklyMap.get(date)!.add(log.member_id);
      }
    });
    const weeklyAttendance = Array.from(weeklyMap.entries())
      .map(([date, members]) => ({ date, count: members.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Monthly revenue summary: last 6 months
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
    const fiveMonthsAgoStr = fiveMonthsAgo.toISOString().slice(0, 7);

    const allPaymentsForMonthly = await prisma.payment.findMany({
      where: { payment_date: { gte: fiveMonthsAgoStr } },
      select: { payment_date: true, amount: true },
    });

    const monthlyMap = new Map<string, number>();
    allPaymentsForMonthly.forEach((p) => {
      if (p.payment_date && p.amount) {
        const month = p.payment_date.substring(0, 7);
        if (month >= fiveMonthsAgoStr) {
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + p.amount);
        }
      }
    });
    const monthlyRevenueSummary = Array.from(monthlyMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const recentActivityLogs = await prisma.log.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        member: {
          select: { first_name: true, last_name: true, image_path: true },
        },
      },
    });

    const recentActivity = recentActivityLogs.map((l) => ({
      log_id: l.log_id,
      member_id: l.member_id,
      card_uid: l.card_uid,
      action: l.action,
      timestamp: l.timestamp,
      duration_seconds: l.duration_seconds,
      first_name: l.member?.first_name ?? null,
      last_name: l.member?.last_name ?? null,
      image_path: l.member?.image_path ?? null,
    }));

    return NextResponse.json({
      checkedInToday,
      walkinsToday: walkinsCount,
      walkinRevenue: walkinTotal,
      revenueToday: totalRevenue,
      membershipRevenueToday: revenueToday,
      activeMembers,
      expiredMembers,
      weeklyAttendance,
      monthlyRevenueSummary,
      recentActivity,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
