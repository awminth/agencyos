/**
 * Generate Workers_Import_Sample.xlsx and verify import API (valid + invalid rollback).
 * Run: node --experimental-strip-types scripts/test-worker-excel-import.mjs
 * Or: npx tsx scripts/test-worker-excel-import.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from '../frontend/node_modules/xlsx-js-style/dist/xlsx.min.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'samples');
const API = process.env.API_BASE || 'http://localhost:1012';

const HEADERS = [
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
];

function writeXlsx(filename, dataRows) {
  fs.mkdirSync(outDir, { recursive: true });
  const aoa = [HEADERS, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Workers');
  const filePath = path.join(outDir, filename);
  XLSX.writeFile(wb, filePath);
  return filePath;
}

function parseSheet(filePath) {
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  const header = rows[0].map((h) => String(h).trim());
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const get = (name) => {
      const i = idx(name);
      return i >= 0 ? line[i] : '';
    };
    const str = (v) => String(v ?? '').trim();
    if (!str(get('Name')) && !str(get('Passport No'))) continue;
    out.push({
      _row: r + 1,
      serialNo: str(get('Serial No')) || undefined,
      name: str(get('Name')),
      gender: str(get('Gender')) === 'Female' ? 'Female' : 'Male',
      dob: str(get('DOB')) || '2000-01-01',
      passportNo: str(get('Passport No')),
      status: str(get('Status')) || 'Active',
      notes: str(get('Notes')),
      deployment: {
        visaType: str(get('Visa Type')),
        supervisingOrg: str(get('Supervising Org')),
        hostCompany: str(get('Host Company')),
        jobCategory: str(get('Job Category')),
        ownCardDate: str(get('Own Card Date')),
        departureDate: str(get('Departure Date')),
        japanEntryDate: str(get('Japan Entry Date')),
        contractEndDate: str(get('Contract End Date')),
      },
      financialConfig: {
        flightFee: Number(get('Flight Fee')) || 150000,
        trainingFee: Number(get('Training Fee')) || 250000,
        managementFee: Number(get('Management Fee')) || 30000,
        billingCycleMonths: Number(get('Billing Cycle Months')) || 6,
        currency: str(get('Currency')) || 'JPY',
      },
    });
  }
  return out;
}

async function postImport(workers) {
  const res = await fetch(`${API}/api/workers/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workers }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function countWorkersByPassport(passport) {
  const res = await fetch(`${API}/api/workers?search=${encodeURIComponent(passport)}`);
  const list = await res.json();
  return Array.isArray(list)
    ? list.filter((w) => String(w.passportNo).toLowerCase() === passport.toLowerCase()).length
    : 0;
}

async function main() {
  // Fetch live settings for valid values
  const varsRes = await fetch(`${API}/api/settings/variables?activeOnly=1`);
  const vars = await varsRes.json();
  if (!Array.isArray(vars) || !vars.length) {
    throw new Error('Could not load settings variables — is the API running?');
  }
  const pick = (cat) => vars.find((v) => v.category === cat)?.value;
  const visa = pick('visa_type');
  const org = pick('supervising_org');
  const host = pick('host_company');
  const job = pick('job_category');
  if (!visa || !org || !host || !job) {
    throw new Error('Missing required settings categories');
  }

  const stamp = Date.now().toString().slice(-6);
  const validPassport = `XL${stamp}A`;
  const validPassport2 = `XL${stamp}B`;

  const validPath = writeXlsx('Workers_Import_Sample.xlsx', [
    [
      '',
      'Excel Sample Worker One',
      'Male',
      '1997-03-15',
      validPassport,
      'Active',
      '',
      'Valid sample row 1',
      visa,
      org,
      host,
      job,
      '2024-01-10',
      '2024-02-01',
      '2024-02-05',
      '2027-02-04',
      150000,
      250000,
      30000,
      6,
      'JPY',
    ],
    [
      '',
      'Excel Sample Worker Two',
      'Female',
      '1999-08-22',
      validPassport2,
      'Active',
      '',
      'Valid sample row 2',
      visa,
      org,
      host,
      job,
      '2024-03-01',
      '2024-04-01',
      '2024-04-10',
      '2027-04-09',
      160000,
      260000,
      30000,
      6,
      'JPY',
    ],
  ]);
  console.log('Wrote sample:', validPath);

  const invalidPath = writeXlsx('Workers_Import_Invalid_Sample.xlsx', [
    [
      '',
      'Should Not Insert',
      'Male',
      '1995-01-01',
      `BAD${stamp}`,
      'Active',
      '',
      'Invalid visa/org',
      'NOT-A-REAL-VISA',
      'Fake Org XYZ',
      host,
      job,
      '',
      '',
      '',
      '',
      150000,
      250000,
      30000,
      6,
      'JPY',
    ],
    [
      '',
      'Also Should Not Insert',
      'Female',
      '1996-02-02',
      `BAD${stamp}2`,
      'Active',
      '',
      'Mixed batch — must all rollback',
      visa,
      org,
      host,
      job,
      '',
      '',
      '',
      '',
      150000,
      250000,
      30000,
      6,
      'JPY',
    ],
  ]);
  console.log('Wrote invalid sample:', invalidPath);

  // --- Test invalid: expect 400 + warnings, no insert ---
  const invalidPayload = parseSheet(invalidPath);
  const beforeBad = await countWorkersByPassport(`BAD${stamp}`);
  const beforeBad2 = await countWorkersByPassport(`BAD${stamp}2`);
  const invalidResult = await postImport(invalidPayload);
  const afterBad = await countWorkersByPassport(`BAD${stamp}`);
  const afterBad2 = await countWorkersByPassport(`BAD${stamp}2`);

  console.log('\n=== Invalid import (expect rollback) ===');
  console.log('HTTP', invalidResult.status);
  console.log('Error:', invalidResult.data.error);
  console.log('Warnings:', invalidResult.data.warnings);
  console.log('Passport counts before/after:', {
    BAD1: `${beforeBad}→${afterBad}`,
    BAD2: `${beforeBad2}→${afterBad2}`,
  });

  if (invalidResult.status !== 400) {
    throw new Error(`Expected 400 for invalid import, got ${invalidResult.status}`);
  }
  if (!invalidResult.data.warnings?.length) {
    throw new Error('Expected warnings array');
  }
  if (afterBad !== beforeBad || afterBad2 !== beforeBad2) {
    throw new Error('ROLLBACK FAILED — invalid rows were inserted');
  }
  console.log('PASS: invalid import rolled back, warnings returned');

  // --- Test valid: expect 201 ---
  const validPayload = parseSheet(validPath);
  const validResult = await postImport(validPayload);
  console.log('\n=== Valid import ===');
  console.log('HTTP', validResult.status);
  console.log('Imported:', validResult.data.imported);
  if (validResult.status !== 201 || validResult.data.imported !== 2) {
    console.log(validResult.data);
    throw new Error('Valid import failed');
  }
  const c1 = await countWorkersByPassport(validPassport);
  const c2 = await countWorkersByPassport(validPassport2);
  if (c1 < 1 || c2 < 1) {
    throw new Error('Valid workers not found after import');
  }
  console.log('PASS: valid import inserted 2 workers');
  console.log('\nAll Excel import checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
