import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const walkins = await prisma.walkin.findMany({
      orderBy: { payment_date: 'desc' },
      take: limit,
      skip: offset,
    });

    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);
    const week = getWeekStart();

    // Today stats
    const todayWalkins = await prisma.walkin.findMany({
      where: { payment_date: today },
      select: { amount_paid: true },
    });
    const todayStats = {
      count: todayWalkins.length,
      total: todayWalkins.reduce((sum, w) => sum + (w.amount_paid || 0), 0),
    };

    // Week stats
    const weekWalkins = await prisma.walkin.findMany({
      where: { payment_date: { gte: week } },
      select: { amount_paid: true },
    });
    const weekStats = {
      count: weekWalkins.length,
      total: weekWalkins.reduce((sum, w) => sum + (w.amount_paid || 0), 0),
    };

    // Month stats
    const monthWalkins = await prisma.walkin.findMany({
      where: { payment_date: { startsWith: month } },
      select: { amount_paid: true },
    });
    const monthStats = {
      count: monthWalkins.length,
      total: monthWalkins.reduce((sum, w) => sum + (w.amount_paid || 0), 0),
    };

    return NextResponse.json({ walkins, todayStats, weekStats, monthStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch walk-ins' }, { status: 500 });
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guest_name, amount_paid, payment_date, notes } = body;

    const date = payment_date || new Date().toISOString().split('T')[0];

    const walkin = await prisma.walkin.create({
      data: {
        guest_name: guest_name || 'Walk-in Guest',
        amount_paid: amount_paid ? parseFloat(amount_paid) : 0,
        payment_date: date,
        notes,
      },
    });

    return NextResponse.json({ success: true, walkin_id: walkin.walkin_id }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to add walk-in';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
