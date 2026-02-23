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
    const { plan_type, start_date, end_date, months_purchased, status } = body;

    await db.execute({
      sql: `UPDATE memberships SET
        plan_type = ?, start_date = ?, end_date = ?,
        months_purchased = ?, status = ?
      WHERE membership_id = ?`,
      args: [plan_type, start_date, end_date, months_purchased, status, id],
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to update membership';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
