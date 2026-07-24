import React, { useEffect, useMemo, useState } from 'react';
import {
  AuthUser,
  Invoice,
  InvoicePayment,
  InvoiceStatus,
  StudentInvoice,
  StudentInvoicePayment,
  StudentInvoiceWorkerSummary,
} from '../types';
import { ArrowLeft, Banknote, Edit, Eye, Trash2, Receipt } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { can } from '../utils/permissions';
import { InvoicePayModal } from './InvoicePayModal';
import { InvoiceDetailSheet } from './InvoiceDetailSheet';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';
import { PaymentVoucherSheet } from './PaymentVoucherSheet';
import { MobileMeta } from './MobileMeta';

function invoiceStatusClass(status: InvoiceStatus) {
  if (status === 'Paid') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Partial') return 'bg-amber-100 text-amber-800';
  if (status === 'Overdue') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function invoiceStatusKey(status: InvoiceStatus) {
  return `status.${status.toLowerCase()}` as
    | 'status.pending'
    | 'status.partial'
    | 'status.paid'
    | 'status.overdue';
}

interface StudentFeeDetailPageProps {
  summary: StudentInvoiceWorkerSummary;
  invoices: StudentInvoice[];
  currentUser: AuthUser;
  onBack: () => void;
  onEditInvoice: (invoice: StudentInvoice) => void;
  onDeleteInvoice: (id: string) => void | Promise<void>;
  onRefresh: () => Promise<void>;
}

export function buildStudentSummaries(
  invoices: StudentInvoice[],
  studentsById: Record<string, { serialNo?: string }>
): StudentInvoiceWorkerSummary[] {
  const map = new Map<string, StudentInvoiceWorkerSummary>();
  for (const invoice of invoices) {
    const existing = map.get(invoice.studentId);
    if (!existing) {
      map.set(invoice.studentId, {
        studentId: invoice.studentId,
        studentName: invoice.studentName,
        passportNo: invoice.passportNo,
        hostCompany: invoice.hostCompany,
        serialNo: studentsById[invoice.studentId]?.serialNo,
        feeType: 'introduction',
        totalAmount: invoice.totalAmount || 0,
        totalPaid: invoice.amountReceived || 0,
        remainAmount: invoice.outstandingAmount || 0,
        invoiceCount: 1,
        paymentCount: invoice.amountReceived > 0 ? 1 : 0,
      });
    } else {
      existing.totalAmount += invoice.totalAmount || 0;
      existing.totalPaid += invoice.amountReceived || 0;
      existing.remainAmount += invoice.outstandingAmount || 0;
      existing.invoiceCount += 1;
      if (invoice.amountReceived > 0) existing.paymentCount += 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
}

function toSharedInvoice(invoice: StudentInvoice): Invoice {
  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    workerId: invoice.studentId,
    workerName: invoice.studentName,
    passportNo: invoice.passportNo,
    hostCompany: invoice.hostCompany,
    supervisingOrg: invoice.supervisingOrg,
    feeType: 'introduction' as any,
    billingPeriod: invoice.billingPeriod,
    lastInvoiceDate: invoice.lastInvoiceDate,
    nextInvoiceDate: invoice.nextInvoiceDate,
    totalAmount: invoice.totalAmount,
    amountReceived: invoice.amountReceived,
    outstandingAmount: invoice.outstandingAmount,
    paymentReceivedDate: invoice.paymentReceivedDate,
    receiptNo: invoice.receiptNo,
    receiptSentDate: invoice.receiptSentDate,
    status: invoice.status,
    currency: invoice.currency,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
  };
}

function toSharedPayment(payment: StudentInvoicePayment): InvoicePayment {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    invoiceNo: payment.invoiceNo,
    workerId: payment.studentId,
    workerName: payment.studentName,
    feeType: 'introduction' as any,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    receiptNo: payment.receiptNo,
    notes: payment.notes,
    currency: payment.currency,
    createdAt: payment.createdAt,
  };
}

export const StudentFeeDetailPage: React.FC<StudentFeeDetailPageProps> = ({
  summary: initialSummary,
  invoices,
  currentUser,
  onBack,
  onEditInvoice,
  onDeleteInvoice,
  onRefresh,
}) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const money = (n: number, c?: string) => formatMoney(n, (c as MoneyCurrency) || 'JPY');

  const canRead = can(currentUser.permissions, 'students', 'read');
  const canUpdate = can(currentUser.permissions, 'students', 'update');
  const canDelete = can(currentUser.permissions, 'students', 'delete');

  const summary = useMemo(() => {
    const list = buildStudentSummaries(invoices, {
      [initialSummary.studentId]: { serialNo: initialSummary.serialNo },
    });
    return (
      list.find((item) => item.studentId === initialSummary.studentId) || {
        ...initialSummary,
        totalAmount: 0,
        totalPaid: 0,
        remainAmount: 0,
        invoiceCount: 0,
        paymentCount: 0,
      }
    );
  }, [invoices, initialSummary]);

  const studentInvoices = invoices.filter((invoice) => invoice.studentId === summary.studentId);

  const [payments, setPayments] = useState<StudentInvoicePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [payInvoice, setPayInvoice] = useState<StudentInvoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<StudentInvoice | null>(null);
  const [printableInvoice, setPrintableInvoice] = useState<StudentInvoice | null>(null);
  const [viewPayment, setViewPayment] = useState<StudentInvoicePayment | null>(null);
  const [viewSummaryVoucher, setViewSummaryVoucher] = useState(false);

  const paymentBalance = (payment: StudentInvoicePayment) => {
    const invoice = studentInvoices.find((item) => item.id === payment.invoiceId);
    const invoiceTotal = invoice?.totalAmount ?? summary.totalAmount;

    const siblings = payments
      .filter((item) => item.invoiceId === payment.invoiceId)
      .slice()
      .sort((a, b) => {
        const byDate = (a.paymentDate || '').localeCompare(b.paymentDate || '');
        if (byDate !== 0) return byDate;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

    const idx = siblings.findIndex((item) => item.id === payment.id);
    const priorPaid = siblings
      .slice(0, idx >= 0 ? idx : siblings.length)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const paid = Number(payment.amount) || 0;
    const opening = invoiceTotal - priorPaid;
    const remain = opening - paid;

    return {
      totalAmount: opening,
      totalPaid: paid,
      remainAmount: remain,
    };
  };

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch(
        `/api/student-invoices/by-student/payments?studentId=${encodeURIComponent(summary.studentId)}`
      );
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, [summary.studentId, invoices]);

  const handlePay = async (payload: Partial<InvoicePayment>) => {
    if (!payInvoice) return;
    const res = await fetch(`/api/student-invoices/${payInvoice.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Pay failed');
    }
    setPayInvoice(null);
    await onRefresh();
  };

  const handleDeletePayment = async (id: string) => {
    const res = await fetch(`/api/student-invoices/payments/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="bento-card space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('invoices.back')}
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold tracking-tight text-slate-900">
                {summary.studentName}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t('students.introductionFee')}
                {summary.serialNo ? ` · ${summary.serialNo}` : ''} · {summary.passportNo}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t('invoices.totalAmount')}
            </p>
            <p className="mt-1 font-mono text-base font-bold text-slate-900">
              {money(summary.totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[10px] font-bold tracking-wider text-emerald-700/70 uppercase">
              {t('invoices.totalPaid')}
            </p>
            <p className="mt-1 font-mono text-base font-bold text-emerald-700">
              {money(summary.totalPaid)}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-bold tracking-wider text-amber-700/70 uppercase">
              {t('invoices.remainAmount')}
            </p>
            <p className="mt-1 font-mono text-base font-bold text-amber-700">
              {money(summary.remainAmount)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setViewSummaryVoucher(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Receipt className="h-3.5 w-3.5" />
            {t('invoices.viewSummaryVoucher')}
          </button>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            {t('invoices.invoicesSection')}
          </h3>
        </div>
        {studentInvoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">{t('students.feesEmpty')}</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {studentInvoices.map((invoice) => (
                <div key={invoice.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-slate-900">{invoice.invoiceNo}</p>
                      <p className="text-[11px] text-slate-500">{invoice.billingPeriod}</p>
                    </div>
                    <span className={`status-badge shrink-0 ${invoiceStatusClass(invoice.status)}`}>
                      {t(invoiceStatusKey(invoice.status))}
                    </span>
                  </div>
                  <MobileMeta
                    items={[
                      {
                        label: t('invoices.colHost'),
                        value: invoice.hostCompany || invoice.supervisingOrg || '—',
                      },
                      {
                        label: t('invoices.colDates'),
                        value: `${t('invoices.last')}: ${invoice.lastInvoiceDate || '—'} · ${t('invoices.next')}: ${invoice.nextInvoiceDate || '—'}`,
                      },
                      { label: t('invoices.total'), value: money(invoice.totalAmount, invoice.currency) },
                      {
                        label: t('invoices.received'),
                        value: money(invoice.amountReceived, invoice.currency),
                      },
                      {
                        label: t('invoices.outstanding'),
                        value: money(invoice.outstandingAmount, invoice.currency),
                      },
                      {
                        label: t('invoices.colReceipt'),
                        value: invoice.receiptNo
                          ? `${invoice.receiptNo}${invoice.paymentReceivedDate ? ` (${invoice.paymentReceivedDate})` : ''}`
                          : '—',
                      },
                      ...(invoice.receiptSentDate
                        ? [{ label: t('invoices.receiptSentDate'), value: invoice.receiptSentDate }]
                        : []),
                      ...(invoice.notes ? [{ label: t('workerDetail.notesTitle'), value: invoice.notes }] : []),
                    ]}
                  />
                  <div className="action-group mt-2">
                    {canRead && (
                      <button
                        type="button"
                        className="action-btn"
                        title={t('common.view')}
                        onClick={() => setViewInvoice(invoice)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        type="button"
                        className="action-btn action-btn-blue"
                        title={t('invoices.pay')}
                        onClick={() => setPayInvoice(invoice)}
                      >
                        <Banknote className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        type="button"
                        className="action-btn"
                        title={t('common.edit')}
                        onClick={() => onEditInvoice(invoice)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="action-btn action-btn-red"
                        title={t('common.delete')}
                        onClick={() => onDeleteInvoice(invoice.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="data-table-wrap hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('invoices.colInvoice')}</th>
                    <th>{t('invoices.colHost')}</th>
                    <th>{t('invoices.colDates')}</th>
                    <th className="text-right">{t('invoices.colAmount')}</th>
                    <th>{t('invoices.colReceipt')}</th>
                    <th>{t('common.status')}</th>
                    <th className="text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {studentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-id">{invoice.invoiceNo}</span>
                          <span className="cell-secondary">{invoice.billingPeriod}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-primary">{invoice.hostCompany || '—'}</span>
                          <span className="cell-secondary">{invoice.supervisingOrg || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-secondary">
                            {t('invoices.last')}: {invoice.lastInvoiceDate || '—'}
                          </span>
                          <span className="cell-secondary">
                            {t('invoices.next')}: {invoice.nextInvoiceDate || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="cell-stack items-end">
                          <span className="cell-mono">{money(invoice.totalAmount, invoice.currency)}</span>
                          <span className="cell-mono text-emerald-600">
                            {money(invoice.amountReceived, invoice.currency)}
                          </span>
                          <span className="cell-mono font-semibold text-amber-700">
                            {money(invoice.outstandingAmount, invoice.currency)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-secondary">{invoice.receiptNo || '—'}</span>
                          <span className="cell-secondary">
                            {invoice.paymentReceivedDate || invoice.receiptSentDate || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge inline-block ${invoiceStatusClass(invoice.status)}`}>
                          {t(invoiceStatusKey(invoice.status))}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-group justify-end">
                          {canRead && (
                            <button
                              type="button"
                              className="action-btn"
                              title={t('common.view')}
                              onClick={() => setViewInvoice(invoice)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              className="action-btn action-btn-blue"
                              title={t('invoices.pay')}
                              onClick={() => setPayInvoice(invoice)}
                            >
                              <Banknote className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              className="action-btn"
                              title={t('common.edit')}
                              onClick={() => onEditInvoice(invoice)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="action-btn action-btn-red"
                              title={t('common.delete')}
                              onClick={() => onDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="bento-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            {t('invoices.vouchersSection')}
          </h3>
        </div>
        {loadingPayments ? (
          <p className="px-5 py-8 text-sm text-slate-400">{t('common.loading')}</p>
        ) : payments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">{t('invoices.noVouchers')}</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {payments.map((payment) => {
                const bal = paymentBalance(payment);
                return (
                  <div key={payment.id} className="px-4 py-3">
                    <p className="font-mono text-sm font-bold text-slate-900">
                      {money(payment.amount, payment.currency)}
                    </p>
                    <MobileMeta
                      items={[
                        { label: t('invoices.payDate'), value: payment.paymentDate || '—' },
                        { label: t('invoices.colInvoice'), value: payment.invoiceNo || '—' },
                        { label: t('invoices.colReceipt'), value: payment.receiptNo || '—' },
                        {
                          label: t('invoices.outstanding'),
                          value: money(bal.remainAmount, payment.currency),
                        },
                        ...(payment.notes ? [{ label: t('workerDetail.notesTitle'), value: payment.notes }] : []),
                      ]}
                    />
                    <div className="action-group mt-2">
                      <button
                        type="button"
                        className="action-btn"
                        title={t('invoices.viewVoucher')}
                        onClick={() => setViewPayment(payment)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          className="action-btn action-btn-red"
                          title={t('common.delete')}
                          onClick={() => handleDeletePayment(payment.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="data-table-wrap hidden md:block">
              <table className="data-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>{t('invoices.payDate')}</th>
                    <th>{t('invoices.colInvoice')}</th>
                    <th className="text-right">{t('invoices.payAmount')}</th>
                    <th>{t('invoices.colReceipt')}</th>
                    <th className="text-right">{t('invoices.outstanding')}</th>
                    <th className="text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const bal = paymentBalance(payment);
                    return (
                      <tr key={payment.id}>
                        <td>
                          <span className="cell-secondary">{payment.paymentDate || '—'}</span>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span className="cell-id">{payment.invoiceNo || '—'}</span>
                            {payment.notes ? (
                              <span className="cell-secondary truncate max-w-[220px]">{payment.notes}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="cell-mono font-semibold text-emerald-700">
                            {money(payment.amount, payment.currency)}
                          </span>
                        </td>
                        <td>
                          <span className="cell-secondary">{payment.receiptNo || '—'}</span>
                        </td>
                        <td className="text-right">
                          <span className="cell-mono text-amber-700">
                            {money(bal.remainAmount, payment.currency)}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="action-group justify-end">
                            <button
                              type="button"
                              className="action-btn"
                              title={t('invoices.viewVoucher')}
                              onClick={() => setViewPayment(payment)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                className="action-btn action-btn-red"
                                title={t('common.delete')}
                                onClick={() => handleDeletePayment(payment.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {payInvoice && (
        <InvoicePayModal
          invoice={toSharedInvoice(studentInvoices.find((item) => item.id === payInvoice.id) || payInvoice)}
          onClose={() => setPayInvoice(null)}
          onSubmit={handlePay}
        />
      )}
      {viewInvoice && (
        <InvoiceDetailSheet
          invoice={toSharedInvoice(studentInvoices.find((item) => item.id === viewInvoice.id) || viewInvoice)}
          canRead={canRead}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onClose={() => setViewInvoice(null)}
          onPrint={() => {
            const invoice = studentInvoices.find((item) => item.id === viewInvoice.id) || viewInvoice;
            setViewInvoice(null);
            setPrintableInvoice(invoice);
          }}
          onEdit={() => {
            const invoice = studentInvoices.find((item) => item.id === viewInvoice.id) || viewInvoice;
            setViewInvoice(null);
            onEditInvoice(invoice);
          }}
          onDelete={() => {
            const id = viewInvoice.id;
            setViewInvoice(null);
            void onDeleteInvoice(id);
          }}
        />
      )}
      {printableInvoice && (
        <PrintableInvoiceModal
          invoice={toSharedInvoice(printableInvoice)}
          onClose={() => setPrintableInvoice(null)}
        />
      )}
      {viewPayment && (
        <PaymentVoucherSheet
          mode="payment"
          payment={toSharedPayment(viewPayment)}
          {...paymentBalance(viewPayment)}
          onClose={() => setViewPayment(null)}
        />
      )}
      {viewSummaryVoucher && (
        <PaymentVoucherSheet
          mode="summary"
          workerName={summary.studentName}
          passportNo={summary.passportNo}
          hostCompany={summary.hostCompany}
          serialNo={summary.serialNo}
          feeType={'introduction' as any}
          totalAmount={summary.totalAmount}
          totalPaid={summary.totalPaid}
          remainAmount={summary.remainAmount}
          payments={payments.map(toSharedPayment)}
          onClose={() => setViewSummaryVoucher(false)}
        />
      )}
    </div>
  );
};
