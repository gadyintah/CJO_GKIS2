import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = params.id;

    const member = db.prepare(`
      SELECT m.*,
        ms.membership_id, ms.plan_type, ms.status as membership_status,
        ms.start_date, ms.end_date, ms.months_purchased,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id
        AND ms.status = 'active'
        AND ms.end_date >= date('now')
      WHERE m.member_id = ?
    `).get(id);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberships = db.prepare(`
      SELECT * FROM memberships WHERE member_id = ? ORDER BY created_at DESC
    `).all(id);

    const payments = db.prepare(`
      SELECT p.*, ms.plan_type FROM payments p
      LEFT JOIN memberships ms ON p.membership_id = ms.membership_id
      WHERE p.member_id = ? ORDER BY p.payment_date DESC
    `).all(id);

    const logs = db.prepare(`
      SELECT * FROM logs WHERE member_id = ? ORDER BY timestamp DESC LIMIT 50
    `).all(id);

    return NextResponse.json({ member, memberships, payments, logs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = params.id;
    const body = await request.json();
    const {
      first_name, last_name, contact_no, address, birthdate,
      emergency_contact, card_uid, custom_card_id, image_path
    } = body;

    db.prepare(`
      UPDATE members SET
        first_name = ?, last_name = ?, contact_no = ?, address = ?,
        birthdate = ?, emergency_contact = ?, card_uid = ?, 
        custom_card_id = ?, image_path = ?
      WHERE member_id = ?
    `).run(first_name, last_name, contact_no, address, birthdate,
           emergency_contact, card_uid, custom_card_id, image_path, id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to update member';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
