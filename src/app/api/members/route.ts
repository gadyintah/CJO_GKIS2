import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { addMonths, addYears, toDateString } from '@/lib/dateUtils';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    let query = `
      SELECT m.*, 
        ms.plan_type, ms.status as membership_status, ms.start_date, ms.end_date,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id 
        AND ms.status = 'active'
        AND ms.end_date >= date('now')
    `;
    const params: string[] = [];

    if (search) {
      query += ` WHERE (m.first_name LIKE ? OR m.last_name LIKE ? OR m.card_uid LIKE ? OR m.custom_card_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status === 'active') {
      query += search ? ' AND' : ' WHERE';
      query += ` ms.membership_id IS NOT NULL`;
    } else if (status === 'expired') {
      query += search ? ' AND' : ' WHERE';
      query += ` ms.membership_id IS NULL`;
    }

    query += ' ORDER BY m.created_at DESC';

    const members = db.prepare(query).all(...params);
    return NextResponse.json({ members });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      first_name, last_name, contact_no, address, birthdate,
      emergency_contact, card_uid, custom_card_id, image_path,
      plan_type, start_date, amount, mop, notes
    } = body;

    const now = new Date().toISOString();
    
    // Calculate end_date
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

    const memberResult = db.prepare(`
      INSERT INTO members (first_name, last_name, contact_no, address, birthdate, 
        emergency_contact, card_uid, custom_card_id, image_path, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(first_name, last_name, contact_no, address, birthdate,
           emergency_contact, card_uid, custom_card_id, image_path, notes, now);

    const member_id = memberResult.lastInsertRowid;

    const membershipResult = db.prepare(`
      INSERT INTO memberships (member_id, plan_type, start_date, end_date, months_purchased, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(member_id, plan_type, start_date_str, end_date, months_purchased, now);

    const membership_id = membershipResult.lastInsertRowid;

    if (amount) {
      db.prepare(`
        INSERT INTO payments (member_id, membership_id, amount, mop, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(member_id, membership_id, amount, mop, now.split('T')[0], 'Initial registration');
    }

    return NextResponse.json({ 
      success: true, 
      member_id,
      membership_id
    }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Failed to create member';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
