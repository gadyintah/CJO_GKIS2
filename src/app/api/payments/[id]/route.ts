import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await request.json();
    const { amount, mop, payment_date, notes } = body;

    await db.execute({
      sql: `UPDATE payments SET
        amount = ?, mop = ?, payment_date = ?, notes = ?
      WHERE payment_id = ?`,
      args: [amount, mop, payment_date, notes, id],
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to update payment';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
