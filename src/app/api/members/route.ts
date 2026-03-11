import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addMonths, addYears, toDateString } from '@/lib/dateUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const todayStr = new Date().toISOString().split('T')[0];

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { card_uid: { contains: search, mode: 'insensitive' } },
        { custom_card_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.memberships = {
        some: { status: 'active', end_date: { gte: todayStr } },
      };
    } else if (status === 'expired') {
      where.memberships = {
        none: { status: 'active', end_date: { gte: todayStr } },
      };
    }

    const memberRows = await prisma.member.findMany({
      where,
      include: {
        memberships: {
          where: { status: 'active', end_date: { gte: todayStr } },
          orderBy: { end_date: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const members = memberRows.map((m) => {
      const ms = m.memberships[0] || null;
      const days_remaining = ms?.end_date
        ? Math.floor(
            (new Date(ms.end_date + 'T00:00:00').getTime() -
              new Date(todayStr + 'T00:00:00').getTime()) /
              86400000,
          )
        : null;
      const { memberships: _, ...memberData } = m;
      return {
        ...memberData,
        plan_type: ms?.plan_type ?? null,
        membership_status: ms?.status ?? null,
        start_date: ms?.start_date ?? null,
        end_date: ms?.end_date ?? null,
        days_remaining,
      };
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name, last_name, contact_no, address, birthdate,
      emergency_contact, card_uid, custom_card_id, image_path,
      plan_type, start_date, amount, mop, notes,
    } = body;

    const now = new Date().toISOString();

    const start = new Date(start_date || new Date());
    let end: Date;
    let months_purchased = 1;
    if (plan_type === 'yearly') {
      end = addYears(start, 1);
      months_purchased = 12;
    } else {
      end = addMonths(start, 1);
      months_purchased = 1;
    }
    const end_date = toDateString(end);
    const start_date_str = toDateString(start);

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          first_name, last_name, contact_no, address, birthdate,
          emergency_contact, card_uid, custom_card_id, image_path, notes,
          created_at: now,
        },
      });

      const membership = await tx.membership.create({
        data: {
          member_id: member.member_id,
          plan_type,
          start_date: start_date_str,
          end_date,
          months_purchased,
          status: 'active',
          created_at: now,
        },
      });

      if (amount) {
        await tx.payment.create({
          data: {
            member_id: member.member_id,
            membership_id: membership.membership_id,
            amount: parseFloat(amount),
            mop,
            payment_date: now.split('T')[0],
            notes: 'Initial registration',
          },
        });
      }

      return { member_id: member.member_id, membership_id: membership.membership_id };
    });

    return NextResponse.json({
      success: true,
      member_id: result.member_id,
      membership_id: result.membership_id,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to create member';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
