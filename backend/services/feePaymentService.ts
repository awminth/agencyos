import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { FeePayment, FeePaymentStatus, FeePaymentSummary, FeeType, Worker } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';
import { getWorkerById } from './workerService.js';

interface FeePaymentRow extends RowDataPacket {
  id: string;
  worker_id: string;
  fee_type: FeeType;
  amount: number;
  payment_date: string;
  receipt_no: string | null;
  notes: string | null;
  currency: 'JPY' | 'MMK' | 'USD';
  created_at: string;
  worker_name?: string;
}

function mapPayment(row: FeePaymentRow): FeePayment {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name || undefined,
    feeType: row.fee_type,
    amount: num(row.amount),
    paymentDate: toDateStr(row.payment_date),
    receiptNo: row.receipt_no || undefined,
    notes: row.notes || undefined,
    currency: row.currency || 'JPY',
    createdAt: toIso(row.created_at),
  };
}

function resolveStatus(totalDue: number, amountReceived: number): FeePaymentStatus {
  if (totalDue <= 0) return amountReceived > 0 ? 'Paid' : 'Pending';
  if (amountReceived <= 0) return 'Pending';
  if (amountReceived >= totalDue) return 'Paid';
  return 'Partial';
}

export async function listFeePayments(filters: {
  workerId?: string;
  feeType?: string;
}): Promise<FeePayment[]> {
  const clauses: string[] = [];
  const params: Record<string, string> = {};

  if (filters.workerId) {
    clauses.push('fp.worker_id = :workerId');
    params.workerId = filters.workerId;
  }
  if (filters.feeType === 'flight' || filters.feeType === 'training') {
    clauses.push('fp.fee_type = :feeType');
    params.feeType = filters.feeType;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query<FeePaymentRow[]>(
    `SELECT fp.*, w.name AS worker_name
     FROM fee_payments fp
     JOIN workers w ON w.id = fp.worker_id
     ${where}
     ORDER BY fp.payment_date DESC, fp.created_at DESC`,
    params
  );
  return rows.map(mapPayment);
}

export async function getFeePaymentById(id: string): Promise<FeePayment> {
  const [rows] = await pool.query<FeePaymentRow[]>(
    `SELECT fp.*, w.name AS worker_name
     FROM fee_payments fp
     JOIN workers w ON w.id = fp.worker_id
     WHERE fp.id = :id`,
    { id }
  );
  if (!rows[0]) throw new AppError('Fee payment not found', 404);
  return mapPayment(rows[0]);
}

async function getReceivedTotal(
  workerId: string,
  feeType: FeeType,
  excludeId?: string
): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM fee_payments
     WHERE worker_id = :workerId AND fee_type = :feeType
       ${excludeId ? 'AND id <> :excludeId' : ''}`,
    { workerId, feeType, excludeId }
  );
  return num(rows[0]?.total);
}

function totalDueForWorker(worker: Worker, feeType: FeeType): number {
  return feeType === 'flight'
    ? num(worker.financialConfig.flightFee)
    : num(worker.financialConfig.trainingFee);
}

async function requireWorker(workerId: string): Promise<Worker> {
  const worker = await getWorkerById(workerId);
  if (!worker) throw new AppError('Worker not found', 404);
  return worker;
}

export async function createFeePayment(body: Partial<FeePayment>): Promise<FeePayment> {
  if (!body.workerId) throw new AppError('workerId is required');
  if (body.feeType !== 'flight' && body.feeType !== 'training') {
    throw new AppError('feeType must be flight or training');
  }
  const amount = num(body.amount);
  if (amount <= 0) throw new AppError('Payment amount must be greater than 0');
  if (!body.paymentDate) throw new AppError('paymentDate is required');

  const worker = await requireWorker(body.workerId);
  const totalDue = totalDueForWorker(worker, body.feeType);
  const alreadyReceived = await getReceivedTotal(body.workerId, body.feeType);
  const outstanding = Math.max(0, totalDue - alreadyReceived);

  if (outstanding <= 0 && totalDue > 0) {
    throw new AppError('This fee is already fully paid');
  }
  if (totalDue > 0 && amount > outstanding + 0.009) {
    throw new AppError(
      `Amount exceeds outstanding balance (${outstanding.toLocaleString()} ${body.currency || 'JPY'})`
    );
  }

  const id = newId('fp');
  await pool.query<ResultSetHeader>(
    `INSERT INTO fee_payments
      (id, worker_id, fee_type, amount, payment_date, receipt_no, notes, currency)
     VALUES
      (:id, :workerId, :feeType, :amount, :paymentDate, :receiptNo, :notes, :currency)`,
    {
      id,
      workerId: body.workerId,
      feeType: body.feeType,
      amount,
      paymentDate: body.paymentDate,
      receiptNo: body.receiptNo || null,
      notes: body.notes || null,
      currency: body.currency || 'JPY',
    }
  );

  return getFeePaymentById(id);
}

export async function updateFeePayment(
  id: string,
  body: Partial<FeePayment>
): Promise<FeePayment> {
  const existing = await getFeePaymentById(id);
  const feeType =
    body.feeType === 'flight' || body.feeType === 'training' ? body.feeType : existing.feeType;
  const amount = body.amount !== undefined ? num(body.amount) : existing.amount;
  if (amount <= 0) throw new AppError('Payment amount must be greater than 0');

  const worker = await requireWorker(existing.workerId);
  const totalDue = totalDueForWorker(worker, feeType);
  const othersReceived = await getReceivedTotal(existing.workerId, feeType, id);
  const outstanding = Math.max(0, totalDue - othersReceived);

  if (totalDue > 0 && amount > outstanding + 0.009) {
    throw new AppError(
      `Amount exceeds outstanding balance (${outstanding.toLocaleString()} ${existing.currency})`
    );
  }

  await pool.query<ResultSetHeader>(
    `UPDATE fee_payments SET
      fee_type = :feeType,
      amount = :amount,
      payment_date = :paymentDate,
      receipt_no = :receiptNo,
      notes = :notes,
      currency = :currency
     WHERE id = :id`,
    {
      id,
      feeType,
      amount,
      paymentDate: body.paymentDate ?? existing.paymentDate,
      receiptNo: body.receiptNo !== undefined ? body.receiptNo || null : existing.receiptNo || null,
      notes: body.notes !== undefined ? body.notes || null : existing.notes || null,
      currency: body.currency || existing.currency,
    }
  );

  return getFeePaymentById(id);
}

export async function deleteFeePayment(id: string): Promise<void> {
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM fee_payments WHERE id = :id`,
    { id }
  );
  if (result.affectedRows === 0) throw new AppError('Fee payment not found', 404);
}

export async function getFeePaymentSummaries(filters?: {
  outstandingOnly?: boolean;
  feeType?: string;
}): Promise<FeePaymentSummary[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      w.id AS workerId,
      w.serial_no AS serialNo,
      w.name AS workerName,
      w.passport_no AS passportNo,
      d.host_company AS hostCompany,
      f.flight_fee AS flightFee,
      f.training_fee AS trainingFee,
      COALESCE((
        SELECT SUM(fp.amount) FROM fee_payments fp
        WHERE fp.worker_id = w.id AND fp.fee_type = 'flight'
      ), 0) AS flightReceived,
      COALESCE((
        SELECT SUM(fp.amount) FROM fee_payments fp
        WHERE fp.worker_id = w.id AND fp.fee_type = 'training'
      ), 0) AS trainingReceived,
      (
        SELECT COUNT(*) FROM fee_payments fp
        WHERE fp.worker_id = w.id AND fp.fee_type = 'flight'
      ) AS flightPaymentCount,
      (
        SELECT COUNT(*) FROM fee_payments fp
        WHERE fp.worker_id = w.id AND fp.fee_type = 'training'
      ) AS trainingPaymentCount,
      (
        SELECT MAX(fp.payment_date) FROM fee_payments fp
        WHERE fp.worker_id = w.id AND fp.fee_type = 'flight'
      ) AS flightLastPaymentDate,
      (
        SELECT MAX(fp.payment_date) FROM fee_payments fp
        WHERE fp.worker_id = w.id AND fp.fee_type = 'training'
      ) AS trainingLastPaymentDate
     FROM workers w
     LEFT JOIN deployments d ON d.worker_id = w.id
     LEFT JOIN financial_configs f ON f.worker_id = w.id
     ORDER BY w.serial_no ASC`
  );

  const items: FeePaymentSummary[] = [];

  for (const row of rows) {
    const types: FeeType[] =
      filters?.feeType === 'flight'
        ? ['flight']
        : filters?.feeType === 'training'
          ? ['training']
          : ['flight', 'training'];

    for (const feeType of types) {
      const totalDue = feeType === 'flight' ? num(row.flightFee) : num(row.trainingFee);
      if (totalDue <= 0) continue;

      const amountReceived =
        feeType === 'flight' ? num(row.flightReceived) : num(row.trainingReceived);
      const outstandingAmount = Math.max(0, totalDue - amountReceived);
      const status = resolveStatus(totalDue, amountReceived);

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
        paymentCount:
          feeType === 'flight' ? num(row.flightPaymentCount) : num(row.trainingPaymentCount),
        lastPaymentDate: (() => {
          const d =
            feeType === 'flight' ? row.flightLastPaymentDate : row.trainingLastPaymentDate;
          return d ? toDateStr(d) : undefined;
        })(),
        currency: 'JPY',
      });
    }
  }

  return items.sort((a, b) => {
    if (a.outstandingAmount !== b.outstandingAmount) {
      return b.outstandingAmount - a.outstandingAmount;
    }
    return a.workerName.localeCompare(b.workerName);
  });
}
