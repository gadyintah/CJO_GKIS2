import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const timestampConditions: Record<string, string> = {};
    if (date) {
      timestampConditions.startsWith = date;
    }
    if (from) {
      timestampConditions.gte = from;
    }
    if (to) {
      timestampConditions.lte = to + '\uffff';
    }

    const where: Record<string, unknown> = {};
    if (Object.keys(timestampConditions).length > 0) {
      where.timestamp = timestampConditions;
    }

    const logRows = await prisma.log.findMany({
      where,
      include: {
        member: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const logs = logRows.map((l: typeof logRows[number]) => ({
      log_id: l.log_id,
      member_id: l.member_id,
      first_name: l.member?.first_name ?? null,
      last_name: l.member?.last_name ?? null,
      card_uid: l.card_uid,
      action: l.action,
      timestamp: l.timestamp,
      duration_seconds: l.duration_seconds,
    }));

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
