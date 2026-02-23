import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import ExcelJS from 'exceljs';

interface MemberRow {
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
  notes: string;
  plan_type: string;
  membership_status: string;
  start_date: string;
  end_date: string;
  months_purchased: number;
  days_remaining: number;
  amount: number;
  mop: string;
  payment_notes: string;
  card_status: string;
}

function deriveCardStatus(row: MemberRow): string {
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
        m.notes,
        ms.plan_type,
        ms.status as membership_status,
        ms.start_date,
        ms.end_date,
        ms.months_purchased,
        CAST((julianday(ms.end_date) - julianday('now')) AS INTEGER) as days_remaining,
        p.amount,
        p.mop,
        p.notes as payment_notes,
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
    })).rows as unknown as MemberRow[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CJO GYM';
    workbook.created = new Date();

    // ── Sheet 1: Complete Member Data ──
    const sheet = workbook.addWorksheet('Members');

    // Column layout — letters used in formulas below
    // A=No, B=Name, C=CardStatus, D=CardNo, E=Status, F=StartDate, G=Months,
    // H=DaysLeft, I=EndDate, J=Amount, K=MOP, L=ContactNo, M=Address,
    // N=Birthdate, O=Age, P=EmergencyContact, Q=EmergencyNo, R=MemberNotes, S=PaymentNotes
    const COL = { name: 'B', status: 'E', months: 'G', amount: 'J', birthdate: 'N', memberNotes: 'R' };

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
      { header: 'Member Notes', key: 'member_notes', width: 36 },
      { header: 'Payment Notes', key: 'payment_notes', width: 36 },
    ];

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 22;

    const dataStartRow = 2;

    rows.forEach((row, index) => {
      const isActive = row.membership_status === 'active' &&
        row.end_date && new Date(row.end_date) >= new Date();
      const statusLabel = isActive ? 'Ongoing' : 'Expired';
      const cardStatus = deriveCardStatus(row);
      const daysLeft = isActive && row.days_remaining != null ? row.days_remaining : '';

      const rowNum = dataStartRow + index;
      const ageFormula = `IF(${COL.birthdate}${rowNum}="","",DATEDIF(${COL.birthdate}${rowNum},TODAY(),"Y"))`;

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
        amount: row.amount || 0,
        mop: row.mop || '',
        contact_no: row.contact_no || '',
        address: row.address || '',
        birthdate: row.birthdate || '',
        age: { formula: ageFormula },
        emergency_contact: row.emergency_contact || '',
        emergency_contact_number: row.emergency_contact_number || '',
        member_notes: row.notes || '',
        payment_notes: row.payment_notes || '',
      });

      // Row color coding
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

      excelRow.alignment = { vertical: 'middle', wrapText: true };
    });

    // ── Summary Formulas Section ──
    const lastDataRow = dataStartRow + rows.length - 1;
    const gapRow = lastDataRow + 2;

    // Summary header
    const summaryHeaderRow = sheet.getRow(gapRow);
    sheet.mergeCells(`A${gapRow}:D${gapRow}`);
    summaryHeaderRow.getCell(1).value = 'SUMMARY';
    summaryHeaderRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    summaryHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    summaryHeaderRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 2; c <= 4; c++) {
      summaryHeaderRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    }
    summaryHeaderRow.height = 24;

    const summaryFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    const summaryFont: Partial<ExcelJS.Font> = { bold: true };
    const summaryLabelFont: Partial<ExcelJS.Font> = { bold: false, color: { argb: 'FF374151' } };

    const summaryItems: { label: string; formula: string }[] = [
      { label: 'Total Members', formula: `COUNTA(${COL.name}${dataStartRow}:${COL.name}${lastDataRow})` },
      { label: 'Active Members', formula: `COUNTIF(${COL.status}${dataStartRow}:${COL.status}${lastDataRow},"Ongoing")` },
      { label: 'Expired Members', formula: `COUNTIF(${COL.status}${dataStartRow}:${COL.status}${lastDataRow},"Expired")` },
      { label: 'Total Revenue', formula: `SUM(${COL.amount}${dataStartRow}:${COL.amount}${lastDataRow})` },
      { label: 'Average Revenue per Member', formula: `IF(COUNTA(${COL.name}${dataStartRow}:${COL.name}${lastDataRow})=0,0,SUM(${COL.amount}${dataStartRow}:${COL.amount}${lastDataRow})/COUNTA(${COL.name}${dataStartRow}:${COL.name}${lastDataRow}))` },
      { label: 'Monthly Plan Members', formula: `COUNTIF(${COL.months}${dataStartRow}:${COL.months}${lastDataRow},1)` },
      { label: 'Members with Notes', formula: `COUNTA(${COL.memberNotes}${dataStartRow}:${COL.memberNotes}${lastDataRow})` },
    ];

    summaryItems.forEach((item, idx) => {
      const r = gapRow + 1 + idx;
      const row = sheet.getRow(r);
      row.getCell(1).value = item.label;
      row.getCell(1).font = summaryLabelFont;
      row.getCell(1).fill = summaryFill;
      row.getCell(2).value = { formula: item.formula };
      row.getCell(2).font = summaryFont;
      row.getCell(2).fill = summaryFill;
      row.getCell(2).numFmt = item.label.includes('Revenue') ? '₱#,##0.00' : '#,##0';
      for (let c = 3; c <= 4; c++) {
        row.getCell(c).fill = summaryFill;
      }
    });

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // ── Sheet 2: Notes Detail ──
    const notesSheet = workbook.addWorksheet('Notes');

    notesSheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Member Name', key: 'name', width: 24 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Member Notes', key: 'member_notes', width: 50 },
      { header: 'Last Payment Notes', key: 'payment_notes', width: 50 },
    ];

    const notesHeaderRow = notesSheet.getRow(1);
    notesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    notesHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    notesHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
    notesHeaderRow.height = 22;

    let noteIdx = 0;
    rows.forEach((row) => {
      if (row.notes || row.payment_notes) {
        const isActive = row.membership_status === 'active' &&
          row.end_date && new Date(row.end_date) >= new Date();
        noteIdx++;
        const nr = notesSheet.addRow({
          no: noteIdx,
          name: `${row.first_name} ${row.last_name}`.trim(),
          status: isActive ? 'Ongoing' : 'Expired',
          member_notes: row.notes || '',
          payment_notes: row.payment_notes || '',
        });
        nr.alignment = { vertical: 'top', wrapText: true };
      }
    });

    // Notes summary with formula
    const notesLastRow = noteIdx + 1;
    const notesSummaryRow = notesSheet.addRow({});
    notesSummaryRow.getCell(1).value = '';
    notesSummaryRow.getCell(2).value = 'Total Members with Notes:';
    notesSummaryRow.getCell(2).font = { bold: true };
    notesSummaryRow.getCell(3).value = { formula: `COUNTA(B2:B${notesLastRow})` };
    notesSummaryRow.getCell(3).font = { bold: true };

    notesSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Write and return
    const buffer = await workbook.xlsx.writeBuffer();

    const today = new Date().toISOString().split('T')[0];
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="CJO_GYM_Google_Sheets_Export_${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate Google Sheets export:', error);
    return NextResponse.json({ error: 'Google Sheets export failed' }, { status: 500 });
  }
}
