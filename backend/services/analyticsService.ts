import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import type { DashboardStats } from '../types/index.js';
import { num } from '../utils/helpers.js';

export async function getDashboardStats(): Promise<DashboardStats> {
  const [[workerCounts]] = await pool.query<RowDataPacket[]>(`
    SELECT
      COUNT(*) AS totalWorkers,
      SUM(status = 'Active') AS activeWorkers,
      SUM(status = 'Contract Ended') AS contractEndedWorkers,
      SUM(status = 'Absconded') AS abscondedWorkers
    FROM workers
  `);

  const [[expiring]] = await pool.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS c
    FROM workers w
    JOIN deployments d ON d.worker_id = w.id
    WHERE w.status = 'Active'
      AND d.contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  `);

  const [[invoiceCounts]] = await pool.query<RowDataPacket[]>(`
    SELECT
      COUNT(*) AS totalInvoicesCount,
      SUM(status IN ('Pending', 'Partial')) AS pendingInvoicesCount,
      SUM(
        fee_type = 'management'
        AND next_invoice_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND status <> 'Paid'
      ) AS upcomingInvoicesCount7Days,
      COALESCE(SUM(outstanding_amount), 0) AS totalOutstandingAmountJPY,
      COALESCE(SUM(amount_received), 0) AS totalCollectedAmountJPY,
      SUM(amount_received > 0 AND receipt_sent_date IS NULL) AS unsentReceiptsCount
    FROM invoices
  `);

  const [[studentInvoiceCounts]] = await pool.query<RowDataPacket[]>(`
    SELECT
      COALESCE(SUM(outstanding_amount), 0) AS totalOutstandingAmountJPY,
      COALESCE(SUM(amount_received), 0) AS totalCollectedAmountJPY,
      SUM(status IN ('Pending', 'Partial')) AS pendingInvoicesCount,
      COUNT(*) AS totalInvoicesCount,
      SUM(amount_received > 0 AND receipt_sent_date IS NULL) AS unsentReceiptsCount
    FROM student_invoices
  `);

  const totalWorkers = num(workerCounts.totalWorkers);
  const abscondedWorkers = num(workerCounts.abscondedWorkers);

  return {
    totalWorkers,
    activeWorkers: num(workerCounts.activeWorkers),
    contractEndedWorkers: num(workerCounts.contractEndedWorkers),
    abscondedWorkers,
    abscondingRate:
      totalWorkers > 0 ? parseFloat(((abscondedWorkers / totalWorkers) * 100).toFixed(1)) : 0,
    totalInvoicesCount:
      num(invoiceCounts.totalInvoicesCount) + num(studentInvoiceCounts.totalInvoicesCount),
    pendingInvoicesCount:
      num(invoiceCounts.pendingInvoicesCount) + num(studentInvoiceCounts.pendingInvoicesCount),
    upcomingInvoicesCount7Days: num(invoiceCounts.upcomingInvoicesCount7Days),
    contractExpiring30DaysCount: num(expiring.c),
    totalOutstandingAmountJPY:
      num(invoiceCounts.totalOutstandingAmountJPY) +
      num(studentInvoiceCounts.totalOutstandingAmountJPY),
    totalCollectedAmountJPY:
      num(invoiceCounts.totalCollectedAmountJPY) +
      num(studentInvoiceCounts.totalCollectedAmountJPY),
    unsentReceiptsCount:
      num(invoiceCounts.unsentReceiptsCount) + num(studentInvoiceCounts.unsentReceiptsCount),
  };
}
