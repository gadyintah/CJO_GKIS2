import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import ExcelJS from 'exceljs';
import { InValue } from '@libsql/client';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    let query = `
      SELECT l.*, m.first_name, m.last_name
      FROM logs l
      LEFT JOIN members m ON l.member_id = m.member_id
      WHERE 1=1
    `;
    const params: InValue[] = [];

    if (date) {
      query += ` AND date(l.timestamp) = ?`;
      params.push(date);
    }
    if (from) {
      query += ` AND date(l.timestamp) >= ?`;
      params.push(from);
    }
    if (to) {
      query += ` AND date(l.timestamp) <= ?`;
      params.push(to);
    }

    query += ` ORDER BY l.timestamp DESC`;

    const logs = (await db.execute({ sql: query, args: params })).rows as unknown as {
      log_id: number;
      member_id: number;
      first_name: string;
      last_name: string;
      card_uid: string;
      action: string;
      timestamp: string;
      duration_seconds: number;
    }[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CJO GYM';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Attendance Logs');

    sheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Date & Time', key: 'datetime', width: 22 },
      { header: 'Member', key: 'member', width: 24 },
      { header: 'Card UID', key: 'card_uid', width: 18 },
      { header: 'Action', key: 'action', width: 12 },
      { header: 'Duration', key: 'duration', width: 14 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    logs.forEach((log, i) => {
      let durationStr = '';
      if (log.duration_seconds) {
        const h = Math.floor(log.duration_seconds / 3600);
        const m = Math.floor((log.duration_seconds % 3600) / 60);
        const s = log.duration_seconds % 60;
        if (h > 0) durationStr = `${h}h ${m}m`;
        else if (m > 0) durationStr = `${m}m ${s}s`;
        else durationStr = `${s}s`;
      }

      const excelRow = sheet.addRow({
        no: i + 1,
        datetime: log.timestamp ? new Date(log.timestamp).toLocaleString('en-PH') : '',
        member: log.first_name ? `${log.first_name} ${log.last_name}`.trim() : 'Unknown',
        card_uid: log.card_uid || '',
        action: log.action === 'CHECK_IN' ? 'Check In' : 'Check Out',
        duration: durationStr,
      });

      if (log.action === 'CHECK_IN') {
        excelRow.getCell('action').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      } else {
        excelRow.getCell('action').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
      }
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();

    const today = new Date().toISOString().split('T')[0];
    let suffix = '';
    if (date) suffix = `_${date}`;
    else if (from && to) suffix = `_${from}_to_${to}`;
    else if (from) suffix = `_from_${from}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="CJO_GYM_Attendance${suffix}_${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Attendance export failed' }, { status: 500 });
  }
}
