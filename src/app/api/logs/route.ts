import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const member_id = searchParams.get('member_id') || '';
    const card_uid = searchParams.get('card_uid') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const timestampConditions: Record<string, string> = {};
    if (date) {
      timestampConditions.startsWith = date;
    }
    if (from) {
      timestampConditions.gte = from;
    }
    if (to) {
      timestampConditions.lte = to + 'T23:59:59.999Z';
    }

    const where: Record<string, unknown> = {};
    if (Object.keys(timestampConditions).length > 0) {
      where.timestamp = timestampConditions;
    }
    if (member_id) {
      where.member_id = parseInt(member_id);
    }
    if (card_uid) {
      where.card_uid = { contains: card_uid, mode: 'insensitive' };
    }

    const logRows = await prisma.log.findMany({
      where,
      include: {
        member: {
          select: { first_name: true, last_name: true, image_path: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const logs = logRows.map((l: typeof logRows[number]) => ({
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

    return NextResponse.json({ logs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
