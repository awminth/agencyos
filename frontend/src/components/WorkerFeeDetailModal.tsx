import React, { useEffect, useMemo, useState } from 'react';
import {
  AuthUser,
  Invoice,
  InvoiceFeeType,
  InvoicePayment,
  InvoiceStatus,
  InvoiceWorkerSummary,
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
import {
  laterDate,
  invoiceStatusBadgeClass,
  invoiceStatusRowClass,
  balanceRemainClass,
  balanceTone,
} from '../utils/invoiceBalanceUi';

function invoiceStatusClass(status: InvoiceStatus) {
  return invoiceStatusBadgeClass(status);
}

function invoiceStatusKey(status: InvoiceStatus) {
  return `status.${status.toLowerCase()}` as
    | 'status.pending'
    | 'status.partial'
    | 'status.paid'
    | 'status.overdue';
}

function outstandingAmountClass(amount: number) {
  return balanceRemainClass(balanceTone(amount, amount > 0 ? amount : 1));
}

function remainCardClass(remainAmount: number) {
  return remainAmount > 0
    ? 'rounded-xl border-2 border-amber-400 bg-amber-100 px-4 py-3'
    : 'rounded-xl border-2 border-blue-500 bg-blue-100 px-4 py-3';
}

function remainCardLabelClass(remainAmount: number) {
  return remainAmount > 0
    ? 'text-[10px] font-bold tracking-wider text-amber-800/80 uppercase'
    : 'text-[10px] font-bold tracking-wider text-blue-700/80 uppercase';
}

function remainCardValueClass(remainAmount: number) {
  return remainAmount > 0
    ? 'mt-1 font-mono text-base font-bold text-amber-900'
    : 'mt-1 font-mono text-base font-bold text-blue-800';
}

function invoiceRowClass(status: InvoiceStatus) {
  return invoiceStatusRowClass(status);
}

interface WorkerFeeDetailPageProps {
  summary: InvoiceWorkerSummary;
  invoices: Invoice[];
  currentUser: AuthUser;
  onBack: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void | Promise<void>;
  onRefresh: () => Promise<void>;
}

export function buildWorkerSummaries(
  invoices: Invoice[],
  feeType: InvoiceFeeType,
  _workersById?: Record<string, { serialNo?: string }>
): InvoiceWorkerSummary[] {
  const map = new Map<string, InvoiceWorkerSummary>();
  for (const inv of invoices) {
    if (inv.feeType !== feeType) continue;
    const hostCompany = inv.hostCompany || '—';
    const key = `${hostCompany}||${inv.supervisingOrg || ''}`;
    const existing = map.get(key);
    const workerCount = inv.workerCount ?? inv.lines?.length ?? 0;
    const payDate = inv.paymentReceivedDate || undefined;
    if (!existing) {
      map.set(key, {
        hostCompany,
        supervisingOrg: inv.supervisingOrg || '',
        workerCount,
        feeType,
        totalAmount: inv.totalAmount || 0,
        totalPaid: inv.amountReceived || 0,
        remainAmount: inv.outstandingAmount || 0,
        invoiceCount: 1,
        paymentCount: inv.amountReceived > 0 ? 1 : 0,
        lastPaymentDate: payDate,
        workerName: hostCompany,
      });
    } else {
      existing.totalAmount += inv.totalAmount || 0;
      existing.totalPaid += inv.amountReceived || 0;
      existing.remainAmount += inv.outstandingAmount || 0;
      existing.invoiceCount += 1;
      existing.workerCount = Math.max(existing.workerCount, workerCount);
      if (inv.amountReceived > 0) existing.paymentCount += 1;
      existing.lastPaymentDate = laterDate(existing.lastPaymentDate, payDate);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.hostCompany.localeCompare(b.hostCompany)
  );
}

export const WorkerFeeDetailPage: React.FC<WorkerFeeDetailPageProps> = ({
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
  const money = (n: number, c?: string) =>
    formatMoney(n, (c as MoneyCurrency) || 'JPY');

  const canRead = can(currentUser.permissions, 'invoices', 'read');
  const canUpdate = can(currentUser.permissions, 'invoices', 'update');
  const canDelete = can(currentUser.permissions, 'invoices', 'delete');

  const summary = useMemo(() => {
    const list = buildWorkerSummaries(invoices, initialSummary.feeType);
    return (
      list.find(
        (s) =>
          s.hostCompany === initialSummary.hostCompany &&
          (s.supervisingOrg || '') === (initialSummary.supervisingOrg || '')
      ) || {
        ...initialSummary,
        totalAmount: 0,
        totalPaid: 0,
        remainAmount: 0,
        invoiceCount: 0,
        paymentCount: 0,
      }
    );
  }, [invoices, initialSummary]);

  const workerInvoices = invoices.filter(
    (i) =>
      i.hostCompany === summary.hostCompany &&
      (i.supervisingOrg || '') === (summary.supervisingOrg || '') &&
      i.feeType === summary.feeType
  );

  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);
  const [viewPayment, setViewPayment] = useState<InvoicePayment | null>(null);
  const [viewSummaryVoucher, setViewSummaryVoucher] = useState(false);

  const paymentBalance = (payment: InvoicePayment) => {
    const inv = workerInvoices.find((i) => i.id === payment.invoiceId);
    const invoiceTotal = inv?.totalAmount ?? summary.totalAmount;

    // Snapshot at this payment: opening balance → this pay → remain
    const siblings = payments
      .filter((p) => p.invoiceId === payment.invoiceId)
      .slice()
      .sort((a, b) => {
        const byDate = (a.paymentDate || '').localeCompare(b.paymentDate || '');
        if (byDate !== 0) return byDate;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

    const idx = siblings.findIndex((p) => p.id === payment.id);
    const priorPaid = siblings
      .slice(0, idx >= 0 ? idx : siblings.length)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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
        `/api/invoices/by-host/payments?hostCompany=${encodeURIComponent(summary.hostCompany)}&feeType=${summary.feeType}`
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
    loadPayments();
  }, [summary.hostCompany, summary.feeType, invoices]);

  const feeLabel =
    summary.feeType === 'flight'
      ? t('workerModal.flightFee')
      : summary.feeType === 'training'
        ? t('workerModal.trainingFee')
        : t('workerModal.managementFee');

  const handlePay = async (payload: Partial<InvoicePayment>) => {
    if (!payInvoice) return;
    const res = await fetch(`/api/invoices/${payInvoice.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Pay failed');
    }
    const created = (await res.json()) as InvoicePayment;
    setPayInvoice(null);
    await onRefresh();
    await loadPayments();
    setViewPayment(created);
  };

  const handleDeletePayment = async (id: string) => {
    const res = await fetch(`/api/invoices/payments/${id}`, { method: 'DELETE' });
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
                {summary.hostCompany}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {feeLabel}
                {summary.supervisingOrg ? ` · ${summary.supervisingOrg}` : ''}
                {` · ${t('invoices.workerCount')}: ${summary.workerCount}`}
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
          <div
            className={
              summary.remainAmount <= 0 && summary.totalAmount > 0
                ? 'rounded-xl border-2 border-blue-500 bg-blue-100 px-4 py-3'
                : 'rounded-xl border border-blue-200 bg-blue-50 px-4 py-3'
            }
          >
            <p className="text-[10px] font-bold tracking-wider text-blue-700/80 uppercase">
              {t('invoices.totalPaid')}
            </p>
            <p className="mt-1 font-mono text-base font-bold text-blue-800">
              {money(summary.totalPaid)}
            </p>
          </div>
          <div className={remainCardClass(summary.remainAmount)}>
            <p className={remainCardLabelClass(summary.remainAmount)}>
              {t('invoices.remainAmount')}
            </p>
            <p className={remainCardValueClass(summary.remainAmount)}>
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
        {workerInvoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400">{t('invoices.noInvoicesForHost')}</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {workerInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className={`px-4 py-3 ${invoiceRowClass(inv.status)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-slate-900">{inv.invoiceNo}</p>
                      <p className="text-[11px] text-slate-500">{inv.billingPeriod}</p>
                      {inv.status === 'Paid' && inv.paymentReceivedDate ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-blue-700">
                          {t('invoices.payDate')}: {inv.paymentReceivedDate}
                        </p>
                      ) : null}
                    </div>
                    <span className={`status-badge shrink-0 ${invoiceStatusClass(inv.status)}`}>
                      {t(invoiceStatusKey(inv.status))}
                    </span>
                  </div>
                  <MobileMeta
                    items={[
                      {
                        label: t('invoices.colHost'),
                        value: inv.hostCompany || inv.supervisingOrg || '—',
                      },
                      {
                        label: t('invoices.colDates'),
                        value: `${t('invoices.last')}: ${inv.lastInvoiceDate || '—'} · ${t('invoices.next')}: ${inv.nextInvoiceDate || '—'}`,
                      },
                      { label: t('invoices.total'), value: money(inv.totalAmount, inv.currency) },
                      {
                        label: t('invoices.received'),
                        value: (
                          <span
                            className={`font-semibold ${
                              inv.status === 'Paid' ? 'text-blue-700' : 'text-amber-800'
                            }`}
                          >
                            {money(inv.amountReceived, inv.currency)}
                          </span>
                        ),
                      },
                      {
                        label: t('invoices.outstanding'),
                        value: (
                          <span className={`font-semibold ${outstandingAmountClass(inv.outstandingAmount)}`}>
                            {money(inv.outstandingAmount, inv.currency)}
                          </span>
                        ),
                      },
                      {
                        label: t('invoices.colReceipt'),
                        value: inv.receiptNo
                          ? `${inv.receiptNo}${inv.paymentReceivedDate ? ` (${inv.paymentReceivedDate})` : ''}`
                          : '—',
                      },
                      ...(inv.receiptSentDate
                        ? [{ label: t('invoices.receiptSentDate'), value: inv.receiptSentDate }]
                        : []),
                      ...(inv.notes ? [{ label: t('workerDetail.notesTitle'), value: inv.notes }] : []),
                    ]}
                  />
                  <div className="action-group mt-2">
                    {canRead && (
                      <button
                        type="button"
                        className="action-btn"
                        title={t('common.view')}
                        onClick={() => setViewInvoice(inv)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        type="button"
                        className="action-btn action-btn-blue"
                        title={t('invoices.pay')}
                        onClick={() => setPayInvoice(inv)}
                      >
                        <Banknote className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        type="button"
                        className="action-btn"
                        title={t('common.edit')}
                        onClick={() => onEditInvoice(inv)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="action-btn action-btn-red"
                        title={t('common.delete')}
                        onClick={() => onDeleteInvoice(inv.id)}
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
                  {workerInvoices.map((inv) => (
                    <tr key={inv.id} className={invoiceRowClass(inv.status)}>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-id">{inv.invoiceNo}</span>
                          <span className="cell-secondary">{inv.billingPeriod}</span>
                          {inv.status === 'Paid' && inv.paymentReceivedDate ? (
                            <span className="text-[11px] font-semibold text-blue-700">
                              {t('invoices.payDate')}: {inv.paymentReceivedDate}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-primary">{inv.hostCompany || '—'}</span>
                          <span className="cell-secondary">{inv.supervisingOrg || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-secondary">
                            {t('invoices.last')}: {inv.lastInvoiceDate || '—'}
                          </span>
                          <span className="cell-secondary">
                            {t('invoices.next')}: {inv.nextInvoiceDate || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="cell-stack items-end">
                          <span className="cell-mono">{money(inv.totalAmount, inv.currency)}</span>
                          <span
                            className={`cell-mono ${
                              inv.status === 'Paid' ? 'text-blue-700' : 'text-amber-800'
                            }`}
                          >
                            {money(inv.amountReceived, inv.currency)}
                          </span>
                          <span
                            className={`cell-mono font-semibold ${outstandingAmountClass(inv.outstandingAmount)}`}
                          >
                            {money(inv.outstandingAmount, inv.currency)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-secondary">{inv.receiptNo || '—'}</span>
                          <span className="cell-secondary">
                            {inv.paymentReceivedDate || inv.receiptSentDate || '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge inline-block ${invoiceStatusClass(inv.status)}`}>
                          {t(invoiceStatusKey(inv.status))}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-group justify-end">
                          {canRead && (
                            <button
                              type="button"
                              className="action-btn"
                              title={t('common.view')}
                              onClick={() => setViewInvoice(inv)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              className="action-btn action-btn-blue"
                              title={t('invoices.pay')}
                              onClick={() => setPayInvoice(inv)}
                            >
                              <Banknote className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              className="action-btn"
                              title={t('common.edit')}
                              onClick={() => onEditInvoice(inv)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="action-btn action-btn-red"
                              title={t('common.delete')}
                              onClick={() => onDeleteInvoice(inv.id)}
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
              {payments.map((p) => {
                const bal = paymentBalance(p);
                return (
                  <div key={p.id} className="px-4 py-3">
                    <p className="font-mono text-sm font-bold text-slate-900">
                      {money(p.amount, p.currency)}
                    </p>
                    <MobileMeta
                      items={[
                        { label: t('invoices.payDate'), value: p.paymentDate || '—' },
                        { label: t('invoices.colInvoice'), value: p.invoiceNo || '—' },
                        { label: t('invoices.colReceipt'), value: p.receiptNo || '—' },
                        {
                          label: t('invoices.outstanding'),
                          value: (
                            <span className={`font-semibold ${outstandingAmountClass(bal.remainAmount)}`}>
                              {money(bal.remainAmount, p.currency)}
                            </span>
                          ),
                        },
                        ...(p.notes ? [{ label: t('workerDetail.notesTitle'), value: p.notes }] : []),
                      ]}
                    />
                    <div className="action-group mt-2">
                      <button
                        type="button"
                        className="action-btn"
                        title={t('invoices.viewVoucher')}
                        onClick={() => setViewPayment(p)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          className="action-btn action-btn-red"
                          title={t('common.delete')}
                          onClick={() => handleDeletePayment(p.id)}
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
                  {payments.map((p) => {
                    const bal = paymentBalance(p);
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="cell-secondary">{p.paymentDate || '—'}</span>
                        </td>
                        <td>
                          <div className="cell-stack">
                            <span className="cell-id">{p.invoiceNo || '—'}</span>
                            {p.notes ? (
                              <span className="cell-secondary truncate max-w-[220px]">{p.notes}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="cell-mono font-semibold text-blue-700">
                            {money(p.amount, p.currency)}
                          </span>
                        </td>
                        <td>
                          <span className="cell-secondary">{p.receiptNo || '—'}</span>
                        </td>
                        <td className="text-right">
                          <span className={`cell-mono ${outstandingAmountClass(bal.remainAmount)}`}>
                            {money(bal.remainAmount, p.currency)}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="action-group justify-end">
                            <button
                              type="button"
                              className="action-btn"
                              title={t('invoices.viewVoucher')}
                              onClick={() => setViewPayment(p)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                className="action-btn action-btn-red"
                                title={t('common.delete')}
                                onClick={() => handleDeletePayment(p.id)}
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
          invoice={invoices.find((i) => i.id === payInvoice.id) || payInvoice}
          onClose={() => setPayInvoice(null)}
          onSubmit={handlePay}
        />
      )}
      {viewInvoice && (
        <InvoiceDetailSheet
          invoice={invoices.find((i) => i.id === viewInvoice.id) || viewInvoice}
          canRead={canRead}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onClose={() => setViewInvoice(null)}
          onPrint={() => {
            const inv = invoices.find((i) => i.id === viewInvoice.id) || viewInvoice;
            setViewInvoice(null);
            setPrintableInvoice(inv);
          }}
          onEdit={() => {
            const inv = invoices.find((i) => i.id === viewInvoice.id) || viewInvoice;
            setViewInvoice(null);
            onEditInvoice(inv);
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
          invoice={printableInvoice}
          onClose={() => setPrintableInvoice(null)}
        />
      )}
      {viewPayment && (
        <PaymentVoucherSheet
          mode="payment"
          payment={viewPayment}
          {...paymentBalance(viewPayment)}
          onClose={() => setViewPayment(null)}
        />
      )}
      {viewSummaryVoucher && (
        <PaymentVoucherSheet
          mode="summary"
          workerName={summary.hostCompany}
          hostCompany={summary.hostCompany}
          supervisingOrg={summary.supervisingOrg}
          feeType={summary.feeType}
          totalAmount={summary.totalAmount}
          totalPaid={summary.totalPaid}
          remainAmount={summary.remainAmount}
          payments={payments}
          onClose={() => setViewSummaryVoucher(false)}
        />
      )}
    </div>
  );
};

/** @deprecated alias kept for imports during rename */
export const WorkerFeeDetailModal = WorkerFeeDetailPage;
