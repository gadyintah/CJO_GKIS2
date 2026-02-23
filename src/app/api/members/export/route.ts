import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import ExcelJS from 'exceljs';

interface ExportRow {
  member_id: number;
  first_name: string;
  last_name: string;
  card_uid: string;
  custom_card_id: string;
  contact_no: string;
  address: string;
  birthdate: string;
  emergency_contact: string;
  emergency_contact_number: string;
  plan_type: string;
  membership_status: string;
  start_date: string;
  end_date: string;
  months_purchased: number;
  days_remaining: number;
  amount: number;
  mop: string;
  card_status: string;
}

function calcAge(birthdate: string): number | string {
  if (!birthdate) return '';
  const dob = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function deriveCardStatus(row: ExportRow): string {
  if (row.card_status) return row.card_status;
  if (!row.custom_card_id && !row.card_uid) return 'unClaimed';
  if (row.membership_status === 'active') return 'CLAIMED + RN PRM';
  return 'CLAIMED (PRM EXP)';
}

export async function GET() {
  try {
    const db = await getDb();

    const rows = (await db.execute({
      sql: `SELECT 
        m.member_id,
        m.first_name,
        m.last_name,
        m.card_uid,
        m.custom_card_id,
        m.contact_no,
        m.address,
        m.birthdate,
        m.emergency_contact,
        m.emergency_contact_number,
        ms.plan_type,
        ms.status as membership_status,
        ms.start_date,
        ms.end_date,
        ms.months_purchased,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining,
        p.amount,
        p.mop,
        NULL as card_status
      FROM members m
      LEFT JOIN memberships ms ON ms.membership_id = (
        SELECT membership_id FROM memberships
        WHERE member_id = m.member_id
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN payments p ON p.payment_id = (
        SELECT payment_id FROM payments
        WHERE member_id = m.member_id
        ORDER BY payment_date DESC LIMIT 1
      )
      ORDER BY m.member_id ASC`,
      args: [],
    })).rows as unknown as ExportRow[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CJO GYM';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Members');

    sheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'CARD STATUS', key: 'card_status', width: 22 },
      { header: 'Card No.', key: 'card_no', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Membership Date', key: 'start_date', width: 16 },
      { header: 'No. of Months', key: 'months', width: 14 },
      { header: 'Days Left', key: 'days_left', width: 10 },
      { header: 'End Date', key: 'end_date', width: 14 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'MOP', key: 'mop', width: 12 },
      { header: 'Contact No.', key: 'contact_no', width: 16 },
      { header: 'Address', key: 'address', width: 28 },
      { header: 'Birthdate', key: 'birthdate', width: 14 },
      { header: 'Age', key: 'age', width: 6 },
      { header: 'Emergency Contact', key: 'emergency_contact', width: 28 },
      { header: 'Emergency Contact No.', key: 'emergency_contact_number', width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF374151' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 20;

    rows.forEach((row, index) => {
      const isActive = row.membership_status === 'active' &&
        row.end_date && new Date(row.end_date) >= new Date();
      const statusLabel = isActive ? 'Ongoing' : 'Expired';
      const cardStatus = deriveCardStatus(row);
      const daysLeft = isActive && row.days_remaining != null ? row.days_remaining : '';

      const excelRow = sheet.addRow({
        no: index + 1,
        name: `${row.first_name} ${row.last_name}`.trim(),
        card_status: cardStatus,
        card_no: row.custom_card_id || row.card_uid || '',
        status: statusLabel,
        start_date: row.start_date || '',
        months: row.months_purchased || '',
        days_left: daysLeft,
        end_date: row.end_date || '',
        amount: row.amount || '',
        mop: row.mop || '',
        contact_no: row.contact_no || '',
        address: row.address || '',
        birthdate: row.birthdate || '',
        age: calcAge(row.birthdate),
        emergency_contact: row.emergency_contact || '',
        emergency_contact_number: row.emergency_contact_number || '',
      });

      let rowFill: ExcelJS.Fill | undefined;
      if (isActive) {
        const daysNum = typeof daysLeft === 'number' ? daysLeft : -1;
        if (daysNum <= 7 && daysNum >= 0) {
          rowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        } else {
          rowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        }
      } else {
        rowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
      }

      if (rowFill) {
        excelRow.eachCell((cell) => {
          cell.fill = rowFill as ExcelJS.Fill;
        });
      }

      excelRow.alignment = { vertical: 'middle' };
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();

    const today = new Date().toISOString().split('T')[0];
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="CJO_GYM_Members_Export_${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
