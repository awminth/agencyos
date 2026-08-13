import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { num, toDateStr } from '../utils/helpers.js';
import { calcAmountDue } from '../utils/invoiceTax.js';
import type { FeePaymentStatus, FeeType, StudentFeePaymentSummary } from '../types/index.js';

function resolveFeeStatus(totalDue: number, amountReceived: number): FeePaymentStatus {
  if (totalDue <= 0) return amountReceived > 0 ? 'Paid' : 'Pending';
  if (amountReceived <= 0) return 'Pending';
  if (amountReceived >= totalDue) return 'Paid';
  return 'Partial';
}

export async function getUpcomingInvoicesReport() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      w.id AS workerId,
      w.serial_no AS serialNo,
      w.name AS workerName,
      w.passport_no AS passportNo,
      d.host_company AS hostCompany,
      d.supervising_org AS supervisingOrg,
      d.departure_date AS departureDate,
      f.management_fee AS managementFee,
      f.billing_cycle_months AS billingCycleMonths,
      (
        SELECT i.last_invoice_date FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'management'
        ORDER BY i.next_invoice_date DESC LIMIT 1
      ) AS lastInvoiceDate,
      (
        SELECT i.next_invoice_date FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'management'
        ORDER BY i.next_invoice_date DESC LIMIT 1
      ) AS nextInvoiceDate
    FROM workers w
    LEFT JOIN deployments d ON d.worker_id = w.id
    LEFT JOIN financial_configs f ON f.worker_id = w.id
    WHERE w.status = 'Active'
  `);

  const today = new Date();
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const items = [];

  for (const row of rows) {
    let lastDate = row.lastInvoiceDate ? toDateStr(row.lastInvoiceDate) : '';
    let nextDate = row.nextInvoiceDate ? toDateStr(row.nextInvoiceDate) : '';

    if (!nextDate) {
      lastDate = toDateStr(row.departureDate) || todayStr;
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + (num(row.billingCycleMonths, 6) || 6));
      nextDate = d.toISOString().split('T')[0];
    }

    if (nextDate <= nextMonthStr) {
      const daysRemaining = Math.ceil(
        (new Date(nextDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      items.push({
        workerId: row.workerId,
        serialNo: row.serialNo,
        workerName: row.workerName,
        passportNo: row.passportNo,
        hostCompany: row.hostCompany || 'N/A',
        supervisingOrg: row.supervisingOrg || 'N/A',
        lastInvoiceDate: lastDate,
        nextInvoiceDate: nextDate,
        daysRemaining,
        managementFee: num(row.managementFee) * num(row.billingCycleMonths, 6),
        currency: 'JPY',
      });
    }
  }

  return items;
}

export async function getOutstandingBalancesReport() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      i.id AS invoiceId,
      i.invoice_no AS invoiceNo,
      i.fee_type AS feeType,
      COALESCE(w.name, i.host_company) AS workerName,
      COALESCE(w.passport_no, '') AS passportNo,
      COALESCE(i.host_company, d.host_company, '') AS hostCompany,
      i.total_amount AS totalAmount,
      COALESCE(i.tax_rate, 0) AS taxRate,
      i.amount_received AS amountReceived,
      i.outstanding_amount AS outstandingAmount,
      i.payment_received_date AS paymentReceivedDate,
      i.receipt_no AS receiptNo,
      i.receipt_sent_date AS receiptSentDate,
      i.currency
    FROM invoices i
    LEFT JOIN workers w ON w.id = i.worker_id
    LEFT JOIN deployments d ON d.worker_id = w.id
    WHERE i.outstanding_amount > 0
       OR (i.amount_received > 0 AND i.receipt_sent_date IS NULL)
  `);

  return rows.map((inv) => {
    const subtotal = num(inv.totalAmount);
    const amountDue = calcAmountDue(subtotal, num(inv.taxRate));
    return {
      invoiceId: inv.invoiceId,
      invoiceNo: inv.invoiceNo,
      feeType: inv.feeType || 'management',
      workerName: inv.workerName || inv.hostCompany || '',
      passportNo: inv.passportNo || '',
      hostCompany: inv.hostCompany || '',
      totalAmount: amountDue,
      amountReceived: num(inv.amountReceived),
      outstandingAmount: num(inv.outstandingAmount),
      paymentReceivedDate: inv.paymentReceivedDate
        ? toDateStr(inv.paymentReceivedDate)
        : undefined,
      receiptNo: inv.receiptNo || undefined,
      receiptSentDate: inv.receiptSentDate ? toDateStr(inv.receiptSentDate) : undefined,
      receiptSentStatus: inv.receiptSentDate ? 'Receipt Sent' : 'Receipt Pending',
      currency: inv.currency || 'JPY',
    };
  });
}

/** Flight / Training / Management fee status from worker invoices (incl. host line items). */
export async function getFeePaymentsReport(filters?: {
  outstandingOnly?: boolean;
  feeType?: string;
}) {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      w.id AS workerId,
      w.serial_no AS serialNo,
      w.name AS workerName,
      w.passport_no AS passportNo,
      d.host_company AS hostCompany,
      f.flight_fee AS flightFee,
      f.training_fee AS trainingFee,
      f.management_fee AS managementFee,
      f.billing_cycle_months AS billingCycleMonths,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.worker_id = w.id THEN
              ROUND(i.total_amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
            ELSE
              ROUND(l.amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
          END
        )
        FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'flight'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ), 0) AS flightDue,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.worker_id = w.id THEN i.amount_received
            WHEN i.total_amount > 0 THEN
              ROUND(i.amount_received * (l.amount / i.total_amount), 2)
            ELSE 0
          END
        )
        FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'flight'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ), 0) AS flightReceived,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.worker_id = w.id THEN
              ROUND(i.total_amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
            ELSE
              ROUND(l.amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
          END
        )
        FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'training'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ), 0) AS trainingDue,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.worker_id = w.id THEN i.amount_received
            WHEN i.total_amount > 0 THEN
              ROUND(i.amount_received * (l.amount / i.total_amount), 2)
            ELSE 0
          END
        )
        FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'training'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ), 0) AS trainingReceived,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.worker_id = w.id THEN
              ROUND(i.total_amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
            ELSE
              ROUND(l.amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
          END
        )
        FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE COALESCE(i.fee_type, 'management') = 'management'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ), 0) AS managementDue,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.worker_id = w.id THEN i.amount_received
            WHEN i.total_amount > 0 THEN
              ROUND(i.amount_received * (l.amount / i.total_amount), 2)
            ELSE 0
          END
        )
        FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE COALESCE(i.fee_type, 'management') = 'management'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ), 0) AS managementReceived,
      (
        SELECT COUNT(DISTINCT i.id) FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'flight'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ) AS flightPaymentCount,
      (
        SELECT COUNT(DISTINCT i.id) FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'training'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ) AS trainingPaymentCount,
      (
        SELECT COUNT(DISTINCT i.id) FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE COALESCE(i.fee_type, 'management') = 'management'
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ) AS managementPaymentCount,
      (
        SELECT MAX(i.payment_received_date) FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'flight'
          AND i.amount_received > 0
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ) AS flightLastPaymentDate,
      (
        SELECT MAX(i.payment_received_date) FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE i.fee_type = 'training'
          AND i.amount_received > 0
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ) AS trainingLastPaymentDate,
      (
        SELECT MAX(i.payment_received_date) FROM invoices i
        LEFT JOIN invoice_lines l ON l.invoice_id = i.id AND l.worker_id = w.id
        WHERE COALESCE(i.fee_type, 'management') = 'management'
          AND i.amount_received > 0
          AND (i.worker_id = w.id OR l.worker_id = w.id)
      ) AS managementLastPaymentDate
     FROM workers w
     LEFT JOIN deployments d ON d.worker_id = w.id
     LEFT JOIN financial_configs f ON f.worker_id = w.id
     ORDER BY w.serial_no ASC
  `);

  const items = [];

  for (const row of rows) {
    const types: FeeType[] =
      filters?.feeType === 'flight'
        ? ['flight']
        : filters?.feeType === 'training'
          ? ['training']
          : filters?.feeType === 'management'
            ? ['management']
            : ['management', 'flight', 'training'];

    for (const feeType of types) {
      let totalDue = 0;
      let amountReceived = 0;
      let paymentCount = 0;
      let last: unknown;

      if (feeType === 'flight') {
        const billed = num(row.flightDue);
        totalDue = billed > 0 ? billed : num(row.flightFee);
        amountReceived = num(row.flightReceived);
        paymentCount = num(row.flightPaymentCount);
        last = row.flightLastPaymentDate;
      } else if (feeType === 'training') {
        const billed = num(row.trainingDue);
        totalDue = billed > 0 ? billed : num(row.trainingFee);
        amountReceived = num(row.trainingReceived);
        paymentCount = num(row.trainingPaymentCount);
        last = row.trainingLastPaymentDate;
      } else {
        const cycleFee =
          num(row.managementFee) * (num(row.billingCycleMonths, 6) || 6);
        const billed = num(row.managementDue);
        totalDue = billed > 0 ? billed : cycleFee;
        amountReceived = num(row.managementReceived);
        paymentCount = num(row.managementPaymentCount);
        last = row.managementLastPaymentDate;
      }

      if (totalDue <= 0 && amountReceived <= 0) continue;

      const outstandingAmount =
        Math.round(Math.max(0, totalDue - amountReceived) * 100) / 100;
      const status = resolveFeeStatus(totalDue, amountReceived);

      if (filters?.outstandingOnly && outstandingAmount <= 0) continue;

      items.push({
        workerId: row.workerId,
        serialNo: row.serialNo,
        workerName: row.workerName,
        passportNo: row.passportNo,
        hostCompany: row.hostCompany || 'N/A',
        feeType,
        totalDue,
        amountReceived,
        outstandingAmount,
        status,
        paymentCount,
        lastPaymentDate: last ? toDateStr(last) : undefined,
        currency: 'JPY',
      });
    }
  }

  return items.sort((a, b) => {
    const order = { management: 0, flight: 1, training: 2 } as Record<string, number>;
    const oa = order[a.feeType] ?? 9;
    const ob = order[b.feeType] ?? 9;
    if (oa !== ob) return oa - ob;
    if (a.outstandingAmount !== b.outstandingAmount) {
      return b.outstandingAmount - a.outstandingAmount;
    }
    return a.workerName.localeCompare(b.workerName);
  });
}

export async function getStudentFeePaymentsReport(): Promise<StudentFeePaymentSummary[]> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      s.id AS studentId,
      s.serial_no AS serialNo,
      s.name AS studentName,
      s.passport_no AS passportNo,
      d.host_company AS hostCompany,
      f.introduction_fee AS introductionFee,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.student_id = s.id THEN
              ROUND(i.total_amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
            ELSE
              ROUND(l.amount * (1 + COALESCE(i.tax_rate, 0) / 100), 2)
          END
        )
        FROM student_invoices i
        LEFT JOIN student_invoice_lines l ON l.invoice_id = i.id AND l.student_id = s.id
        WHERE i.fee_type = 'introduction'
          AND (i.student_id = s.id OR l.student_id = s.id)
      ), 0) AS billedDue,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN i.student_id = s.id THEN i.amount_received
            WHEN i.total_amount > 0 THEN
              ROUND(i.amount_received * (l.amount / i.total_amount), 2)
            ELSE 0
          END
        )
        FROM student_invoices i
        LEFT JOIN student_invoice_lines l ON l.invoice_id = i.id AND l.student_id = s.id
        WHERE i.fee_type = 'introduction'
          AND (i.student_id = s.id OR l.student_id = s.id)
      ), 0) AS amountReceived,
      (
        SELECT COUNT(DISTINCT i.id) FROM student_invoices i
        LEFT JOIN student_invoice_lines l ON l.invoice_id = i.id AND l.student_id = s.id
        WHERE i.fee_type = 'introduction'
          AND (i.student_id = s.id OR l.student_id = s.id)
      ) AS paymentCount,
      (
        SELECT MAX(i.payment_received_date) FROM student_invoices i
        LEFT JOIN student_invoice_lines l ON l.invoice_id = i.id AND l.student_id = s.id
        WHERE i.fee_type = 'introduction'
          AND i.amount_received > 0
          AND (i.student_id = s.id OR l.student_id = s.id)
      ) AS lastPaymentDate
    FROM students s
    LEFT JOIN student_deployments d ON d.student_id = s.id
    LEFT JOIN student_financial_configs f ON f.student_id = s.id
    ORDER BY s.serial_no ASC
  `);

  return rows
    .map((row) => {
      const billed = num(row.billedDue);
      const totalDue = billed > 0 ? billed : num(row.introductionFee);
      const amountReceived = num(row.amountReceived);
      const outstandingAmount =
        Math.round(Math.max(0, totalDue - amountReceived) * 100) / 100;
      const status = resolveFeeStatus(totalDue, amountReceived);

      return {
        studentId: String(row.studentId),
        serialNo: String(row.serialNo),
        studentName: String(row.studentName),
        passportNo: String(row.passportNo),
        hostCompany: row.hostCompany || 'N/A',
        feeType: 'introduction' as const,
        totalDue,
        amountReceived,
        outstandingAmount,
        status,
        paymentCount: num(row.paymentCount),
        lastPaymentDate: row.lastPaymentDate ? toDateStr(row.lastPaymentDate) : undefined,
        currency: 'JPY',
      };
    })
    .filter((item) => item.totalDue > 0 || item.amountReceived > 0);
}

export async function getContractExpirationsReport() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      w.id AS workerId,
      w.serial_no AS serialNo,
      w.name AS workerName,
      w.passport_no AS passportNo,
      w.status,
      d.host_company AS hostCompany,
      d.visa_type AS visaType,
      d.departure_date AS departureDate,
      d.contract_end_date AS contractEndDate
    FROM workers w
    JOIN deployments d ON d.worker_id = w.id
    WHERE d.contract_end_date IS NOT NULL
  `);

  const today = new Date();

  return rows
    .map((w) => {
      const exp = new Date(toDateStr(w.contractEndDate));
      const daysToExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        workerId: w.workerId,
        serialNo: w.serialNo,
        workerName: w.workerName,
        passportNo: w.passportNo,
        hostCompany: w.hostCompany || 'N/A',
        visaType: w.visaType || 'N/A',
        departureDate: toDateStr(w.departureDate) || 'N/A',
        contractEndDate: toDateStr(w.contractEndDate),
        daysToExpiry,
        status: w.status,
      };
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}
