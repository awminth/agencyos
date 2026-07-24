import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { num, toDateStr } from '../utils/helpers.js';
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
      w.name AS workerName,
      w.passport_no AS passportNo,
      d.host_company AS hostCompany,
      i.total_amount AS totalAmount,
      i.amount_received AS amountReceived,
      i.outstanding_amount AS outstandingAmount,
      i.payment_received_date AS paymentReceivedDate,
      i.receipt_no AS receiptNo,
      i.receipt_sent_date AS receiptSentDate,
      i.currency
    FROM invoices i
    JOIN workers w ON w.id = i.worker_id
    LEFT JOIN deployments d ON d.worker_id = w.id
    WHERE i.outstanding_amount > 0
       OR (i.amount_received > 0 AND i.receipt_sent_date IS NULL)
  `);

  return rows.map((inv) => ({
    invoiceId: inv.invoiceId,
    invoiceNo: inv.invoiceNo,
    feeType: inv.feeType || 'management',
    workerName: inv.workerName,
    passportNo: inv.passportNo,
    hostCompany: inv.hostCompany || '',
    totalAmount: num(inv.totalAmount),
    amountReceived: num(inv.amountReceived),
    outstandingAmount: num(inv.outstandingAmount),
    paymentReceivedDate: inv.paymentReceivedDate
      ? toDateStr(inv.paymentReceivedDate)
      : undefined,
    receiptNo: inv.receiptNo || undefined,
    receiptSentDate: inv.receiptSentDate ? toDateStr(inv.receiptSentDate) : undefined,
    receiptSentStatus: inv.receiptSentDate ? 'Receipt Sent' : 'Receipt Pending',
    currency: inv.currency || 'JPY',
  }));
}

/** Flight / Training / Management fee status from worker config + invoice payments. */
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
        SELECT SUM(i.amount_received) FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'flight'
      ), 0) AS flightReceived,
      COALESCE((
        SELECT SUM(i.amount_received) FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'training'
      ), 0) AS trainingReceived,
      COALESCE((
        SELECT SUM(i.amount_received) FROM invoices i
        WHERE i.worker_id = w.id AND COALESCE(i.fee_type, 'management') = 'management'
      ), 0) AS managementReceived,
      COALESCE((
        SELECT SUM(i.total_amount) FROM invoices i
        WHERE i.worker_id = w.id AND COALESCE(i.fee_type, 'management') = 'management'
      ), 0) AS managementBilled,
      (
        SELECT COUNT(*) FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'flight'
      ) AS flightPaymentCount,
      (
        SELECT COUNT(*) FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'training'
      ) AS trainingPaymentCount,
      (
        SELECT COUNT(*) FROM invoices i
        WHERE i.worker_id = w.id AND COALESCE(i.fee_type, 'management') = 'management'
      ) AS managementPaymentCount,
      (
        SELECT MAX(i.payment_received_date) FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'flight'
          AND i.amount_received > 0
      ) AS flightLastPaymentDate,
      (
        SELECT MAX(i.payment_received_date) FROM invoices i
        WHERE i.worker_id = w.id AND i.fee_type = 'training'
          AND i.amount_received > 0
      ) AS trainingLastPaymentDate,
      (
        SELECT MAX(i.payment_received_date) FROM invoices i
        WHERE i.worker_id = w.id AND COALESCE(i.fee_type, 'management') = 'management'
          AND i.amount_received > 0
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
        totalDue = num(row.flightFee);
        amountReceived = num(row.flightReceived);
        paymentCount = num(row.flightPaymentCount);
        last = row.flightLastPaymentDate;
      } else if (feeType === 'training') {
        totalDue = num(row.trainingFee);
        amountReceived = num(row.trainingReceived);
        paymentCount = num(row.trainingPaymentCount);
        last = row.trainingLastPaymentDate;
      } else {
        const cycleFee =
          num(row.managementFee) * (num(row.billingCycleMonths, 6) || 6);
        const billed = num(row.managementBilled);
        // If invoices exist, use billed total; otherwise show configured cycle amount.
        totalDue = billed > 0 ? billed : cycleFee;
        amountReceived = num(row.managementReceived);
        paymentCount = num(row.managementPaymentCount);
        last = row.managementLastPaymentDate;
      }

      if (totalDue <= 0 && amountReceived <= 0) continue;

      const outstandingAmount = Math.max(0, totalDue - amountReceived);
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
        SELECT SUM(i.amount_received) FROM student_invoices i
        WHERE i.student_id = s.id AND i.fee_type = 'introduction'
      ), 0) AS amountReceived,
      (
        SELECT COUNT(*) FROM student_invoices i
        WHERE i.student_id = s.id AND i.fee_type = 'introduction'
      ) AS paymentCount,
      (
        SELECT MAX(i.payment_received_date) FROM student_invoices i
        WHERE i.student_id = s.id AND i.fee_type = 'introduction'
          AND i.amount_received > 0
      ) AS lastPaymentDate
    FROM students s
    LEFT JOIN student_deployments d ON d.student_id = s.id
    LEFT JOIN student_financial_configs f ON f.student_id = s.id
    ORDER BY s.serial_no ASC
  `);

  return rows
    .map((row) => {
      const totalDue = num(row.introductionFee);
      const amountReceived = num(row.amountReceived);
      const outstandingAmount = Math.max(0, totalDue - amountReceived);
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
