import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    const member = (await db.execute({
      sql: `SELECT m.*,
        ms.membership_id, ms.plan_type, ms.status as membership_status,
        ms.start_date, ms.end_date, ms.months_purchased,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
        AND ms.status = 'active'
        AND ms.end_date >= date('now')
      WHERE m.member_id = ?`,
      args: [id],
    })).rows[0];

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberships = (await db.execute({
      sql: `SELECT * FROM memberships WHERE member_id = ? ORDER BY created_at DESC`,
      args: [id],
    })).rows;

    const payments = (await db.execute({
      sql: `SELECT p.*, ms.plan_type FROM payments p
      LEFT JOIN memberships ms ON p.membership_id = ms.membership_id
      WHERE p.member_id = ? ORDER BY p.payment_date DESC`,
      args: [id],
    })).rows;

    const logs = (await db.execute({
      sql: `SELECT * FROM logs WHERE member_id = ? ORDER BY timestamp DESC LIMIT 50`,
      args: [id],
    })).rows;

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
    const db = await getDb();
    const { id } = await params;
    const body = await request.json();
    const {
      first_name, last_name, contact_no, address, birthdate,
      emergency_contact, emergency_contact_number, card_uid, custom_card_id, image_path, notes
    } = body;

    await db.execute({
      sql: `UPDATE members SET
        first_name = ?, last_name = ?, contact_no = ?, address = ?,
        birthdate = ?, emergency_contact = ?, emergency_contact_number = ?, card_uid = ?, 
        custom_card_id = ?, image_path = ?, notes = ?
      WHERE member_id = ?`,
      args: [first_name, last_name, contact_no, address, birthdate,
             emergency_contact, emergency_contact_number, card_uid, custom_card_id, image_path, notes, id],
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to update member';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
