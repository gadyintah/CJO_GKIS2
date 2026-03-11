import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

interface ExportRow {
  member_id: number;
  first_name: string;
  last_name: string;
  card_uid: string | null;
  custom_card_id: string | null;
  contact_no: string | null;
  address: string | null;
  birthdate: string | null;
  emergency_contact: string | null;
  plan_type: string | null;
  membership_status: string | null;
  start_date: string | null;
  end_date: string | null;
  months_purchased: number | null;
  days_remaining: number | null;
  amount: number | null;
  mop: string | null;
  card_status: string | null;
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
    const todayStr = new Date().toISOString().split('T')[0];

    const members = await prisma.member.findMany({
      include: {
        memberships: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        payments: {
          orderBy: { payment_date: 'desc' },
          take: 1,
        },
      },
      orderBy: { member_id: 'asc' },
    });

    const rows: ExportRow[] = members.map((m) => {
      const ms = m.memberships[0] || null;
      const p = m.payments[0] || null;
      const days_remaining = ms?.end_date
        ? Math.floor(
            (new Date(ms.end_date + 'T00:00:00').getTime() -
              new Date(todayStr + 'T00:00:00').getTime()) /
              86400000,
          )
        : null;

      return {
        member_id: m.member_id,
        first_name: m.first_name,
        last_name: m.last_name,
        card_uid: m.card_uid,
        custom_card_id: m.custom_card_id,
        contact_no: m.contact_no,
        address: m.address,
        birthdate: m.birthdate,
        emergency_contact: m.emergency_contact,
        plan_type: ms?.plan_type ?? null,
        membership_status: ms?.status ?? null,
        start_date: ms?.start_date ?? null,
        end_date: ms?.end_date ?? null,
        months_purchased: ms?.months_purchased ?? null,
        days_remaining,
        amount: p?.amount ?? null,
        mop: p?.mop ?? null,
        card_status: null,
      };
    });

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
        age: calcAge(row.birthdate || ''),
        emergency_contact: row.emergency_contact || '',
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
