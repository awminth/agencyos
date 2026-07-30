/**
 * Workers Excel template download + import parse (xlsx-js-style).
 * Column headers must match WORKER_EXCEL_HEADERS exactly for import.
 */
import XLSX from 'xlsx-js-style';
import type { Worker } from '../types';

export const WORKER_EXCEL_HEADERS = [
  'Serial No',
  'Name',
  'Gender',
  'DOB',
  'Passport No',
  'Status',
  'Absconded Date',
  'Notes',
  'Visa Type',
  'Supervising Org',
  'Host Company',
  'Job Category',
  'Own Card Date',
  'Departure Date',
  'Japan Entry Date',
  'Contract End Date',
  'Flight Fee',
  'Training Fee',
  'Management Fee',
  'Billing Cycle Months',
  'Currency',
] as const;

export type WorkerExcelHeader = (typeof WORKER_EXCEL_HEADERS)[number];

export interface WorkerImportRow extends Partial<Worker> {
  _row: number;
}

export interface SystemVariableOption {
  category: string;
  value: string;
}

const thinBorder = {
  top: { style: 'thin', color: { rgb: '334155' } },
  bottom: { style: 'thin', color: { rgb: '334155' } },
  left: { style: 'thin', color: { rgb: '334155' } },
  right: { style: 'thin', color: { rgb: '334155' } },
};

const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '1E40AF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinBorder,
};

const requiredHeaderStyle = {
  ...headerStyle,
  fill: { fgColor: { rgb: 'B45309' } },
};

const dataCellStyle = {
  border: thinBorder,
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

const REQUIRED_HEADERS = new Set<string>([
  'Name',
  'Passport No',
  'Visa Type',
  'Supervising Org',
  'Host Company',
  'Job Category',
]);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Normalize Excel date / string to YYYY-MM-DD */
export function toExcelDateStr(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date
    const parsed = XLSX.SSF?.parse_date_code?.(value);
    if (parsed) {
      return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
    }
  }
  const s = String(value).trim();
  if (!s) return '';
  // Already ISO-like
  const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return s;
}

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return toExcelDateStr(value);
  return String(value).trim();
}

function numOr(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function applySheetStyles(
  ws: Record<string, unknown> & { '!ref'?: string; '!cols'?: { wch: number }[] },
  headerRowIndex: number,
  colCount: number
) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = headerRowIndex; R <= range.e.r; R++) {
    for (let C = 0; C < colCount; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    }
  }
  for (let C = 0; C < colCount; C++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
    const header = WORKER_EXCEL_HEADERS[C];
    (ws[addr] as { s?: unknown }).s = REQUIRED_HEADERS.has(header)
      ? requiredHeaderStyle
      : headerStyle;
  }
  for (let R = headerRowIndex + 1; R <= range.e.r; R++) {
    for (let C = 0; C < colCount; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      (ws[addr] as { s?: unknown }).s = {
        ...dataCellStyle,
        fill: { fgColor: { rgb: R % 2 === 0 ? 'F8FAFC' : 'FFFFFF' } },
      };
    }
  }
  ws['!cols'] = WORKER_EXCEL_HEADERS.map((h) => ({
    wch: Math.min(Math.max(h.length + 2, 14), 36),
  }));
}

function sampleRowFromSettings(vars: SystemVariableOption[]): (string | number)[] {
  const pick = (cat: string, fallback: string) =>
    vars.find((v) => v.category === cat)?.value || fallback;

  return [
    '', // Serial No auto
    'Sample Worker Aung',
    'Male',
    '1998-05-12',
    'MP1234567',
    'Active',
    '',
    'Excel import sample row',
    pick('visa_type', 'TITP-1'),
    pick('supervising_org', 'Japan Skill Cooperative (JSC)'),
    pick('host_company', 'Tanaka Precision Machinery Co., Ltd.'),
    pick('job_category', 'Machining & Metal Works'),
    '2024-01-15',
    '2024-02-01',
    '2024-02-05',
    '2027-02-04',
    150000,
    250000,
    30000,
    6,
    'JPY',
  ];
}

/** Download Workers import template (.xlsx) with optional sample + Settings reference sheet */
export function downloadWorkerImportTemplate(
  variables: SystemVariableOption[],
  options?: { includeSample?: boolean }
) {
  const includeSample = options?.includeSample !== false;
  const aoa: (string | number)[][] = [
    [...WORKER_EXCEL_HEADERS],
  ];
  if (includeSample) {
    aoa.push(sampleRowFromSettings(variables));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  applySheetStyles(ws, 0, WORKER_EXCEL_HEADERS.length);

  // Instructions / reference sheet
  const visa = variables.filter((v) => v.category === 'visa_type').map((v) => v.value);
  const orgs = variables.filter((v) => v.category === 'supervising_org').map((v) => v.value);
  const hosts = variables.filter((v) => v.category === 'host_company').map((v) => v.value);
  const jobs = variables.filter((v) => v.category === 'job_category').map((v) => v.value);
  const maxLen = Math.max(visa.length, orgs.length, hosts.length, jobs.length, 1);

  const refAoa: string[][] = [
    ['Workers Excel Import — Settings Reference'],
    ['Orange headers = required. Values must match Settings → System Variables exactly.'],
    ['Gender: Male | Female'],
    ['Status: Active | Contract Ended | Absconded'],
    ['Currency: JPY | MMK | USD'],
    ['Dates: YYYY-MM-DD (e.g. 2024-05-01)'],
    [],
    ['Visa Type', 'Supervising Org', 'Host Company', 'Job Category'],
  ];
  for (let i = 0; i < maxLen; i++) {
    refAoa.push([visa[i] || '', orgs[i] || '', hosts[i] || '', jobs[i] || '']);
  }

  const wsRef = XLSX.utils.aoa_to_sheet(refAoa);
  wsRef['!cols'] = [{ wch: 28 }, { wch: 36 }, { wch: 40 }, { wch: 32 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Workers');
  XLSX.utils.book_append_sheet(wb, wsRef, 'Settings Reference');
  XLSX.writeFile(wb, 'Workers_Import_Template.xlsx');
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .replace(/\uFEFF/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Parse Workers sheet into import payloads (with Excel row numbers). */
export function parseWorkerExcelFile(buffer: ArrayBuffer): WorkerImportRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n: string) => n.toLowerCase() === 'workers') || wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel sheet မတွေ့ပါ။');

  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (!rows.length) throw new Error('Excel ဖိုင် ဗလာ ဖြစ်နေပါသည်။');

  const headerRow = (rows[0] || []).map(normalizeHeader);
  const indexOf = (name: string) =>
    headerRow.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const missing = WORKER_EXCEL_HEADERS.filter((h) => REQUIRED_HEADERS.has(h) && indexOf(h) < 0);
  if (missing.length) {
    throw new Error(
      `Template header မကိုက်ညီပါ။ လိုအပ်သော columns: ${missing.join(', ')}`
    );
  }

  const col = (name: WorkerExcelHeader) => indexOf(name);

  const result: WorkerImportRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r] || [];
    const get = (name: WorkerExcelHeader) => {
      const i = col(name);
      return i >= 0 ? line[i] : '';
    };

    const name = cellStr(get('Name'));
    const passportNo = cellStr(get('Passport No'));
    // Skip fully empty rows
    const anyValue = WORKER_EXCEL_HEADERS.some((h) => cellStr(get(h)) !== '');
    if (!anyValue) continue;
    if (!name && !passportNo) continue;

    result.push({
      _row: r + 1, // 1-based Excel row
      serialNo: cellStr(get('Serial No')) || undefined,
      name,
      gender: cellStr(get('Gender')) === 'Female' ? 'Female' : 'Male',
      dob: toExcelDateStr(get('DOB')) || '2000-01-01',
      passportNo,
      status: (cellStr(get('Status')) || 'Active') as Worker['status'],
      abscondedDate: toExcelDateStr(get('Absconded Date')) || undefined,
      notes: cellStr(get('Notes')),
      deployment: {
        visaType: cellStr(get('Visa Type')),
        supervisingOrg: cellStr(get('Supervising Org')),
        hostCompany: cellStr(get('Host Company')),
        jobCategory: cellStr(get('Job Category')),
        ownCardDate: toExcelDateStr(get('Own Card Date')),
        departureDate: toExcelDateStr(get('Departure Date')),
        japanEntryDate: toExcelDateStr(get('Japan Entry Date')),
        contractEndDate: toExcelDateStr(get('Contract End Date')),
      },
      financialConfig: {
        flightFee: numOr(get('Flight Fee'), 150000),
        trainingFee: numOr(get('Training Fee'), 250000),
        managementFee: numOr(get('Management Fee'), 30000),
        billingCycleMonths: numOr(get('Billing Cycle Months'), 6),
        currency: (['JPY', 'MMK', 'USD'].includes(cellStr(get('Currency')))
          ? cellStr(get('Currency'))
          : 'JPY') as 'JPY' | 'MMK' | 'USD',
      },
    });
  }

  if (!result.length) {
    throw new Error('Import လုပ်ရန် data row မရှိပါ။');
  }

  return result;
}
