import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { plan_type, start_date, end_date, months_purchased, status } = body;

    await prisma.membership.update({
      where: { membership_id: parseInt(id) },
      data: { plan_type, start_date, end_date, months_purchased, status },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to update membership';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
