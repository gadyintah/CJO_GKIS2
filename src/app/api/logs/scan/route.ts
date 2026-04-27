import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function buildMemberWithMembership(
  memberRow: Record<string, unknown>,
  activeMembership: Record<string, unknown> | null,
  todayStr: string,
) {
  const days_remaining = activeMembership?.end_date
    ? Math.floor(
        (new Date(activeMembership.end_date as string + 'T00:00:00').getTime() -
          new Date(todayStr + 'T00:00:00').getTime()) /
          86400000,
      )
    : null;

  return {
    ...memberRow,
    membership_id: activeMembership?.membership_id ?? null,
    plan_type: activeMembership?.plan_type ?? null,
    membership_status: activeMembership?.status ?? null,
    start_date: activeMembership?.start_date ?? null,
    end_date: activeMembership?.end_date ?? null,
    days_remaining,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { card_uid } = body;

    if (!card_uid) {
      return NextResponse.json({ error: 'card_uid required' }, { status: 400 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const today = nowIso.split('T')[0];

    const memberRow = await prisma.member.findUnique({
      where: { card_uid },
    });

    if (!memberRow) {
      return NextResponse.json({
        found: false,
        message: 'Card not registered — Please see the front desk',
      });
    }

    const activeMembership = await prisma.membership.findFirst({
      where: { member_id: memberRow.member_id, status: 'active', end_date: { gte: today } },
      orderBy: { end_date: 'desc' },
    });

    const member = buildMemberWithMembership(
      memberRow as unknown as Record<string, unknown>,
      activeMembership as unknown as Record<string, unknown> | null,
      today,
    );

    // Find unmatched check-in today: a CHECK_IN with no subsequent CHECK_OUT
    const todayCheckIns = await prisma.log.findMany({
      where: { member_id: memberRow.member_id, action: 'CHECK_IN', timestamp: { startsWith: today } },
      orderBy: { timestamp: 'desc' },
    });

    const todayCheckOuts = await prisma.log.findMany({
      where: { member_id: memberRow.member_id, action: 'CHECK_OUT', timestamp: { startsWith: today } },
    });

    let existingCheckIn: typeof todayCheckIns[0] | undefined;
    for (const ci of todayCheckIns) {
      const hasMatchingCheckOut = todayCheckOuts.some(
        (co) => co.timestamp && ci.timestamp && co.timestamp > ci.timestamp,
      );
      if (!hasMatchingCheckOut) {
        existingCheckIn = ci;
        break;
      }
    }

    let action: string;
    let duration_seconds: number | null = null;

    if (!existingCheckIn) {
      action = 'CHECK_IN';
      await prisma.log.create({
        data: { member_id: memberRow.member_id, card_uid, action: 'CHECK_IN', timestamp: nowIso, duration_seconds: null },
      });
    } else {
      action = 'CHECK_OUT';
      const checkInTime = new Date(existingCheckIn.timestamp as string);
      duration_seconds = Math.floor((now.getTime() - checkInTime.getTime()) / 1000);
      await prisma.log.create({
        data: { member_id: memberRow.member_id, card_uid, action: 'CHECK_OUT', timestamp: nowIso, duration_seconds },
      });
    }

    const sessionCount = await prisma.log.count({
      where: { member_id: memberRow.member_id, action: 'CHECK_IN', timestamp: { startsWith: today } },
    });

    const hasActiveMembership = !!activeMembership;

    return NextResponse.json({
      found: true,
      member,
      action,
      duration_seconds,
      session_count_today: sessionCount,
      has_active_membership: hasActiveMembership,
      message: action === 'CHECK_IN' ? 'Welcome! Checked in successfully.' : 'Goodbye! Checked out successfully.',
      timestamp: nowIso,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const card_uid = searchParams.get('card_uid') || '';

    if (!card_uid) {
      return NextResponse.json({ error: 'card_uid required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const memberRow = await prisma.member.findUnique({
      where: { card_uid },
    });

    if (!memberRow) {
      return NextResponse.json({ found: false, message: 'Card not registered' });
    }

    const activeMembership = await prisma.membership.findFirst({
      where: { member_id: memberRow.member_id, status: 'active', end_date: { gte: today } },
      orderBy: { end_date: 'desc' },
    });

    const member = buildMemberWithMembership(
      memberRow as unknown as Record<string, unknown>,
      activeMembership as unknown as Record<string, unknown> | null,
      today,
    );

    return NextResponse.json({ found: true, member });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
