import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const todayStr = new Date().toISOString().split('T')[0];

    const memberRows = await prisma.member.findMany({
      where: {
        OR: [
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
          { card_uid: { contains: q, mode: 'insensitive' } },
          { custom_card_id: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        memberships: {
          where: { status: 'active', end_date: { gte: todayStr } },
          orderBy: { end_date: 'desc' },
          take: 1,
        },
      },
      orderBy: { first_name: 'asc' },
      take: 20,
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { memberships: _memberships, ...memberData } = m;
      return {
        ...memberData,
        plan_type: ms?.plan_type ?? null,
        membership_status: ms?.status ?? null,
        end_date: ms?.end_date ?? null,
        days_remaining,
      };
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
