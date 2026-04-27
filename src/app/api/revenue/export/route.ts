import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '';

    // Payments with member and membership info
    const paymentWhere = month ? { payment_date: { startsWith: month } } : {};

    const paymentRows = await prisma.payment.findMany({
      where: paymentWhere,
      include: {
        member: { select: { first_name: true, last_name: true } },
        membership: { select: { plan_type: true } },
      },
      orderBy: { payment_date: 'desc' },
    });

    const payments = paymentRows.map((p) => ({
      payment_id: p.payment_id,
      member_id: p.member_id,
      first_name: p.member?.first_name ?? null,
      last_name: p.member?.last_name ?? null,
      amount: p.amount,
      mop: p.mop,
      payment_date: p.payment_date,
      notes: p.notes,
      plan_type: p.membership?.plan_type ?? null,
    }));

    // Walk-ins
    const walkinWhere = month ? { payment_date: { startsWith: month } } : {};

    const walkins = await prisma.walkin.findMany({
      where: walkinWhere,
      orderBy: { payment_date: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CJO GYM';
    workbook.created = new Date();

    // Membership Payments sheet
    const paySheet = workbook.addWorksheet('Membership Payments');
    paySheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Member', key: 'member', width: 24 },
      { header: 'Plan', key: 'plan', width: 12 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Method', key: 'mop', width: 12 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    const payHeader = paySheet.getRow(1);
    payHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    payHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    payHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    let totalMembership = 0;
    payments.forEach((p, i) => {
      totalMembership += p.amount || 0;
      paySheet.addRow({
        no: i + 1,
        date: p.payment_date || '',
        member: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        plan: p.plan_type || '',
        amount: p.amount || 0,
        mop: p.mop || '',
        notes: p.notes || '',
      });
    });

    const payTotalRow = paySheet.addRow({
      no: '',
      date: '',
      member: '',
      plan: 'TOTAL',
      amount: totalMembership,
      mop: '',
      notes: '',
    });
    payTotalRow.font = { bold: true };

    // Walk-ins sheet
    const walkSheet = workbook.addWorksheet('Walk-in Revenue');
    walkSheet.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Guest Name', key: 'name', width: 24 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    const walkHeader = walkSheet.getRow(1);
    walkHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    walkHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    walkHeader.alignment = { horizontal: 'center', vertical: 'middle' };

    let totalWalkins = 0;
    walkins.forEach((w, i) => {
      totalWalkins += w.amount_paid || 0;
      walkSheet.addRow({
        no: i + 1,
        date: w.payment_date || '',
        name: w.guest_name || 'Walk-in Guest',
        amount: w.amount_paid || 0,
        notes: w.notes || '',
      });
    });

    const walkTotalRow = walkSheet.addRow({
      no: '',
      date: '',
      name: 'TOTAL',
      amount: totalWalkins,
      notes: '',
    });
    walkTotalRow.font = { bold: true };

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Amount', key: 'amount', width: 16 },
      { header: 'Count', key: 'count', width: 10 },
    ];

    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };

    summarySheet.addRow({ category: 'Membership Payments', amount: totalMembership, count: payments.length });
    summarySheet.addRow({ category: 'Walk-in Revenue', amount: totalWalkins, count: walkins.length });
    const grandTotalRow = summarySheet.addRow({ category: 'Grand Total', amount: totalMembership + totalWalkins, count: payments.length + walkins.length });
    grandTotalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    const today = new Date().toISOString().split('T')[0];
    const suffix = month ? `_${month}` : '';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="CJO_GYM_Revenue${suffix}_${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Revenue export failed' }, { status: 500 });
  }
}
