import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { addMonths, toDateString } from '@/lib/dateUtils';
import ExcelJS from 'exceljs';

interface ImportedRow {
  name?: string;
  card_no?: string;
  status?: string;
  membership_date?: string;
  no_of_months?: string | number;
  end_date?: string;
  amount?: string | number;
  mop?: string;
  contact_no?: string;
  address?: string;
  birthdate?: string;
  emergency_contact?: string;
  emergency_contact_number?: string;
  card_status?: string;
  [key: string]: unknown;
}

// Normalize a header string to a consistent key
function normalizeHeader(raw: string): string {
  return raw.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+$/, '');
}

// Map normalised column names to canonical field names
const COLUMN_MAP: Record<string, keyof ImportedRow> = {
  name: 'name',
  full_name: 'name',
  card_no: 'card_no',
  card_number: 'card_no',
  custom_card_id: 'card_no',
  card_id: 'card_no',
  status: 'status',
  membership_status: 'status',
  membership_date: 'membership_date',
  start_date: 'membership_date',
  no_of_months: 'no_of_months',
  months: 'no_of_months',
  months_purchased: 'no_of_months',
  end_date: 'end_date',
  expiry_date: 'end_date',
  expiration: 'end_date',
  amount: 'amount',
  payment_amount: 'amount',
  mop: 'mop',
  method_of_payment: 'mop',
  payment_method: 'mop',
  contact_no: 'contact_no',
  contact_number: 'contact_no',
  phone: 'contact_no',
  phone_number: 'contact_no',
  mobile: 'contact_no',
  mobile_number: 'contact_no',
  address: 'address',
  birthdate: 'birthdate',
  birth_date: 'birthdate',
  birthday: 'birthdate',
  emergency_contact: 'emergency_contact',
  emergency: 'emergency_contact',
  emergency_contact_number: 'emergency_contact_number',
  emergency_number: 'emergency_contact_number',
  emergency_phone: 'emergency_contact_number',
  card_status: 'card_status',
};

/**
 * Parse a CSV line respecting quoted fields.
 * Handles commas inside quoted values (e.g. "1,350") correctly.
 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cells.push(current.trim());
  return cells;
}

// Parse a flexible date string into YYYY-MM-DD
function parseDate(value: unknown): string {
  if (!value) return '';
  const str = String(value).trim();
  if (!str || str === '0' || str === 'N/A' || str === '-') return '';

  // Try common formats
  const formats = [
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (const re of formats) {
    const m = str.match(re);
    if (m) {
      // Determine year/month/day based on pattern
      let year: number, month: number, day: number;
      if (re === formats[0]) {
        [, year, month, day] = m.map(Number);
      } else if (re === formats[1]) {
        [, month, day, year] = m.map(Number);
      } else {
        [, day, month, year] = m.map(Number);
      }
      if (month < 1 || month > 12 || day < 1 || day > 31) continue;
      // Reject unreasonable years (before 2020 or after 2099)
      if (year < 2020 || year > 2099) continue;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try natural language dates (e.g. "January 12, 2026")
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    // Use UTC values to avoid timezone shift for date-only strings
    const y = parsed.getUTCFullYear();
    // Reject unreasonable years
    if (y < 2020 || y > 2099) return '';
    const mo = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  return '';
}

/**
 * Parse a numeric amount, stripping commas and currency symbols.
 * Returns null for invalid or unreasonable amounts.
 */
function parseAmount(value: unknown): number | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  // Remove currency symbols, commas, and spaces
  const cleaned = str.replace(/[₱$,\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return null;
  // Sanity check: reject amounts over 1,000,000 (likely parsing error)
  if (num > 1000000) return null;
  return num;
}

// Map status text to DB status
function parseStatus(value: unknown): string {
  const s = String(value || '').toLowerCase().trim();
  if (s === 'ongoing' || s === 'active') return 'active';
  if (s === 'expired' || s === 'inactive') return 'expired';
  return 'expired';
}

// Split "First Last" into first_name / last_name
function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  const last_name = parts.pop() as string;
  return { first_name: parts.join(' '), last_name };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const previewOnly = formData.get('preview') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const fileName = file.name.toLowerCase();
    if (!allowedTypes.includes(file.type) && !fileName.endsWith('.xlsx') && !fileName.endsWith('.csv') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file type. Only .xlsx, .xls, and .csv files are accepted.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();

    if (fileName.endsWith('.csv')) {
      // Parse CSV with proper quoted-field handling
      const csvText = Buffer.from(bytes).toString('utf-8');
      const lines = csvText.split(/\r?\n/);
      const headers = parseCsvLine(lines[0]);
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(headers);
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const cells = parseCsvLine(lines[i]);
          sheet.addRow(cells);
        }
      }
    } else {
      await workbook.xlsx.load(bytes as ArrayBuffer);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: 'No worksheet found in file' }, { status: 400 });
    }

    // Parse headers from row 1
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = normalizeHeader(String(cell.value || ''));
    });

    // Build column-index → canonical-field mapping
    const colFieldMap: Record<number, keyof ImportedRow> = {};
    headers.forEach((h, idx) => {
      const canonical = COLUMN_MAP[h];
      if (canonical) colFieldMap[idx] = canonical;
    });

    // Parse data rows
    const importedRows: ImportedRow[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const obj: ImportedRow = {};
      let hasData = false;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const field = colFieldMap[colNumber - 1];
        const val = cell.value;
        if (field && val !== null && val !== undefined && String(val).trim() !== '') {
          obj[field] = String(val).trim();
          hasData = true;
        }
      });

      if (hasData && obj.name) {
        importedRows.push(obj);
      }
    });

    if (importedRows.length === 0) {
      return NextResponse.json({ error: 'No data rows found. Make sure the file has a header row and data rows.' }, { status: 400 });
    }

    // If preview only, return the first 10 rows
    if (previewOnly) {
      return NextResponse.json({
        preview: importedRows.slice(0, 10),
        total: importedRows.length,
        columns: Object.values(colFieldMap).filter((v, i, a) => a.indexOf(v) === i),
      });
    }

    // Perform actual import
    const db = await getDb();
    let created = 0;
    let updated = 0;
    const errors: { row: number; error: string }[] = [];

    const tx = await db.transaction('write');
    try {
      for (let index = 0; index < importedRows.length; index++) {
        const row = importedRows[index];
        try {
          const { first_name, last_name } = splitName(String(row.name || ''));
          if (!first_name) throw new Error('Name is required');

          const custom_card_id = String(row.card_no || '').trim() || null;
          const contact_no = String(row.contact_no || '').trim() || null;
          const address = String(row.address || '').trim() || null;
          const birthdate = parseDate(row.birthdate) || null;
          const emergency_contact = String(row.emergency_contact || '').trim() || null;
          const emergency_contact_number = String(row.emergency_contact_number || '').trim() || null;
          const start_date = parseDate(row.membership_date) || null;
          const end_date = parseDate(row.end_date) || null;
          const months_purchased = row.no_of_months ? parseInt(String(row.no_of_months)) || null : null;

          // If end_date is missing but start_date + months_purchased are known,
          // calculate end_date so the membership is not stored with a NULL end_date
          let computedEndDate = end_date;
          if (!computedEndDate && start_date && months_purchased && months_purchased > 0) {
            const startObj = new Date(start_date + 'T00:00:00');
            computedEndDate = toDateString(addMonths(startObj, months_purchased));
          }

          // Derive the definitive membership status from the (computed) end_date.
          let memberStatus: string;
          if (computedEndDate) {
            const todayStr = new Date().toISOString().split('T')[0];
            memberStatus = computedEndDate >= todayStr ? 'active' : 'expired';
          } else {
            memberStatus = parseStatus(row.status);
          }
          const amount = parseAmount(row.amount);
          const mop = String(row.mop || '').trim() || null;
          const now = new Date().toISOString();

          // Check for existing member by custom_card_id
          let existingMember: { member_id: number } | null = null;
          if (custom_card_id) {
            const existingResult = (await tx.execute({
              sql: `SELECT member_id FROM members WHERE custom_card_id = ? LIMIT 1`,
              args: [custom_card_id],
            })).rows[0] as unknown as { member_id: number } | undefined;
            existingMember = existingResult || null;
          }

          let member_id: number;

          if (existingMember) {
            // Update existing member
            await tx.execute({
              sql: `UPDATE members SET
                first_name = ?, last_name = ?, contact_no = ?,
                address = ?, birthdate = ?, emergency_contact = ?, emergency_contact_number = ?
              WHERE member_id = ?`,
              args: [first_name, last_name, contact_no, address, birthdate, emergency_contact, emergency_contact_number, existingMember.member_id],
            });
            member_id = existingMember.member_id;
            updated++;
          } else {
            // Create new member
            const result = await tx.execute({
              sql: `INSERT INTO members (first_name, last_name, contact_no, address, birthdate,
                emergency_contact, emergency_contact_number, custom_card_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [first_name, last_name, contact_no, address, birthdate, emergency_contact, emergency_contact_number, custom_card_id, now],
            });
            member_id = Number(result.lastInsertRowid);
            created++;
          }

          // Create membership if dates are present
          if (start_date || computedEndDate) {
            // Expire previous active memberships
            await tx.execute({
              sql: `UPDATE memberships SET status = 'expired'
              WHERE member_id = ? AND status = 'active'`,
              args: [member_id],
            });

            const membershipResult = await tx.execute({
              sql: `INSERT INTO memberships (member_id, plan_type, start_date, end_date, months_purchased, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [
                member_id,
                months_purchased && months_purchased >= 12 ? 'yearly' : 'monthly',
                start_date,
                computedEndDate,
                months_purchased,
                memberStatus,
                now,
              ],
            });

            // Create payment if amount provided
            if (amount) {
              await tx.execute({
                sql: `INSERT INTO payments (member_id, membership_id, amount, mop, payment_date, notes)
                VALUES (?, ?, ?, ?, ?, ?)`,
                args: [
                  member_id,
                  Number(membershipResult.lastInsertRowid),
                  amount,
                  mop,
                  start_date || now.split('T')[0],
                  'Imported from spreadsheet',
                ],
              });
            }
          }
        } catch (err) {
          errors.push({ row: index + 2, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }
      await tx.commit();
    } catch (commitError) {
      try { tx.rollback(); } catch { /* ignore rollback errors */ }
      throw commitError;
    } finally {
      tx.close();
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      total: importedRows.length,
      message: `Imported ${created} new members, updated ${updated} existing members${errors.length > 0 ? `, ${errors.length} errors` : ''}.`,
    });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
