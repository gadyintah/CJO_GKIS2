import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);
    const todayStr = new Date().toISOString().split('T')[0];

    const memberRow = await prisma.member.findUnique({
      where: { member_id: memberId },
    });

    if (!memberRow) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const activeMembership = await prisma.membership.findFirst({
      where: { member_id: memberId, status: 'active', end_date: { gte: todayStr } },
      orderBy: { end_date: 'desc' },
    });

    const days_remaining = activeMembership?.end_date
      ? Math.floor(
          (new Date(activeMembership.end_date + 'T00:00:00').getTime() -
            new Date(todayStr + 'T00:00:00').getTime()) /
            86400000,
        )
      : null;

    const member = {
      ...memberRow,
      membership_id: activeMembership?.membership_id ?? null,
      plan_type: activeMembership?.plan_type ?? null,
      membership_status: activeMembership?.status ?? null,
      start_date: activeMembership?.start_date ?? null,
      end_date: activeMembership?.end_date ?? null,
      months_purchased: activeMembership?.months_purchased ?? null,
      days_remaining,
    };

    const memberships = await prisma.membership.findMany({
      where: { member_id: memberId },
      orderBy: { created_at: 'desc' },
    });

    const paymentRows = await prisma.payment.findMany({
      where: { member_id: memberId },
      include: {
        membership: { select: { plan_type: true } },
      },
      orderBy: { payment_date: 'desc' },
    });

    const payments = paymentRows.map((p) => {
      const { membership, ...rest } = p;
      return { ...rest, plan_type: membership?.plan_type ?? null };
    });

    const logs = await prisma.log.findMany({
      where: { member_id: memberId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return NextResponse.json({ member, memberships, payments, logs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      first_name, last_name, contact_no, address, birthdate,
      emergency_contact, card_uid, custom_card_id, image_path, notes,
    } = body;

    await prisma.member.update({
      where: { member_id: parseInt(id) },
      data: {
        first_name, last_name, contact_no, address, birthdate,
        emergency_contact, card_uid, custom_card_id, image_path, notes,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to update member';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
