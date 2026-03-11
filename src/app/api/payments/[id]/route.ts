import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, mop, payment_date, notes } = body;

    await prisma.payment.update({
      where: { payment_id: parseInt(id) },
      data: { amount: amount != null ? parseFloat(amount) : null, mop, payment_date, notes },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to update payment';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
