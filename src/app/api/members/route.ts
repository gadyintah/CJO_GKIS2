import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { addMonths, addYears, toDateString } from '@/lib/dateUtils';
import { InValue } from '@libsql/client';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '100')));
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: InValue[] = [];

    if (search) {
      whereClause += ` WHERE (m.first_name LIKE ? OR m.last_name LIKE ? OR m.card_uid LIKE ? OR m.custom_card_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status === 'active') {
      whereClause += search ? ' AND' : ' WHERE';
      whereClause += ` ms.membership_id IS NOT NULL`;
    } else if (status === 'expired') {
      whereClause += search ? ' AND' : ' WHERE';
      whereClause += ` ms.membership_id IS NULL`;
    }

    const baseFrom = `
      FROM members m
      LEFT JOIN memberships ms ON m.member_id = ms.member_id 
        AND ms.status = 'active'
        AND ms.end_date >= date('now')
    `;

    const countResult = (await db.execute({
      sql: `SELECT COUNT(*) as count` + baseFrom + whereClause,
      args: params,
    })).rows[0] as unknown as { count: number };
    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / limit);

    const members = (await db.execute({
      sql: `SELECT m.*, 
        ms.plan_type, ms.status as membership_status, ms.start_date, ms.end_date,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining` + baseFrom + whereClause + ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`,
      args: [...params, limit, offset],
    })).rows;

    return NextResponse.json({ members, totalCount, page, totalPages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      first_name, last_name, contact_no, address, birthdate,
      emergency_contact, emergency_contact_number, card_uid, custom_card_id, image_path,
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

    const memberResult = await db.execute({
      sql: `INSERT INTO members (first_name, last_name, contact_no, address, birthdate, 
        emergency_contact, emergency_contact_number, card_uid, custom_card_id, image_path, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [first_name, last_name, contact_no, address, birthdate,
             emergency_contact, emergency_contact_number, card_uid, custom_card_id, image_path, notes, now],
    });

    const member_id = Number(memberResult.lastInsertRowid);

    const membershipResult = await db.execute({
      sql: `INSERT INTO memberships (member_id, plan_type, start_date, end_date, months_purchased, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      args: [member_id, plan_type, start_date_str, end_date, months_purchased, now],
    });

    const membership_id = Number(membershipResult.lastInsertRowid);

    if (amount) {
      await db.execute({
        sql: `INSERT INTO payments (member_id, membership_id, amount, mop, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)`,
        args: [member_id, membership_id, amount, mop, now.split('T')[0], 'Initial registration'],
      });
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
