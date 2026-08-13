import React, { useEffect, useMemo, useState } from 'react';
import { Invoice, InvoiceFeeType, Worker } from '../types';
import { ArrowLeft, Receipt, Save, Building2 } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { currencySymbol, type MoneyCurrency } from '../utils/currency';
import {
  FormalInvoiceFields,
  type FormalInvoiceFormValues,
} from './FormalInvoiceFields';

interface SystemVariable {
  id: string;
  category: string;
  value: string;
  parentValue?: string | null;
}

interface InvoiceFormPageProps {
  invoice: Invoice | null;
  workers: Worker[];
  defaultFeeType?: InvoiceFeeType;
  preferredHostCompany?: string;
  preferredSupervisingOrg?: string;
  onBack: () => void;
  onSave: (data: Partial<Invoice>) => void | Promise<void>;
}

function amountForFee(worker: Worker, feeType: InvoiceFeeType): number {
  const cycle = worker.financialConfig.billingCycleMonths || 6;
  if (feeType === 'flight') return worker.financialConfig.flightFee || 0;
  if (feeType === 'training') return worker.financialConfig.trainingFee || 0;
  return (worker.financialConfig.managementFee || 0) * cycle;
}

function periodForFee(feeType: InvoiceFeeType, host: string): string {
  const year = new Date().getFullYear();
  if (feeType === 'flight') return `Flight Fee — ${host}`;
  if (feeType === 'training') return `Training Fee — ${host}`;
  return `${year} Cycle — ${host}`;
}

function nextDateForFee(feeType: InvoiceFeeType, lastDate: string): string {
  if (feeType !== 'management') return lastDate;
  const d = new Date(lastDate);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
}

function feeLabel(t: (k: string) => string, feeType: InvoiceFeeType) {
  if (feeType === 'flight') return t('workerModal.flightFee');
  if (feeType === 'training') return t('workerModal.trainingFee');
  return t('workerModal.managementFee');
}

export const InvoiceFormPage: React.FC<InvoiceFormPageProps> = ({
  invoice,
  workers,
  defaultFeeType = 'management',
  preferredHostCompany,
  preferredSupervisingOrg,
  onBack,
  onSave,
}) => {
  const isEdit = !!invoice;
  const { t } = useLanguage();
  const { formatMoney, displayCurrency } = useCurrency();
  const feeType = invoice?.feeType || defaultFeeType;

  const [orgOptions, setOrgOptions] = useState<string[]>([]);
  const [hostVars, setHostVars] = useState<SystemVariable[]>([]);
  const [selectedOrg, setSelectedOrg] = useState(
    invoice?.supervisingOrg || preferredSupervisingOrg || ''
  );
  const [selectedHost, setSelectedHost] = useState(
    invoice?.hostCompany || preferredHostCompany || ''
  );
  const [invoiceNo, setInvoiceNo] = useState(
    invoice?.invoiceNo ||
      `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [billingPeriod, setBillingPeriod] = useState(
    invoice?.billingPeriod || periodForFee(feeType, selectedHost || 'Host')
  );
  const [lastInvoiceDate, setLastInvoiceDate] = useState(
    invoice?.lastInvoiceDate || new Date().toISOString().split('T')[0]
  );
  const [nextInvoiceDate, setNextInvoiceDate] = useState(
    invoice?.nextInvoiceDate ||
      nextDateForFee(feeType, new Date().toISOString().split('T')[0])
  );
  const [receiptSentDate, setReceiptSentDate] = useState(invoice?.receiptSentDate || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [formal, setFormal] = useState<FormalInvoiceFormValues>({
    billedToAttn: invoice?.billedToAttn || 'Management / Representatives',
    subject: invoice?.subject || '',
    taxRate: invoice?.taxRate ?? 10,
    bankAccountId: invoice?.bankAccountId || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/variables?activeOnly=1')
      .then((r) => r.json())
      .then((rows: SystemVariable[]) => {
        if (!Array.isArray(rows)) return;
        setOrgOptions(rows.filter((v) => v.category === 'supervising_org').map((v) => v.value));
        setHostVars(rows.filter((v) => v.category === 'host_company'));
      })
      .catch(() => undefined);
  }, []);

  const hostOptions = useMemo(() => {
    const fromSettings = hostVars
      .filter((v) => !selectedOrg || !v.parentValue || v.parentValue === selectedOrg)
      .map((v) => v.value);
    const fromWorkers = Array.from(
      new Set(
        workers
          .filter((w) => !selectedOrg || w.deployment.supervisingOrg === selectedOrg)
          .map((w) => w.deployment.hostCompany)
          .filter(Boolean)
      )
    );
    return Array.from(new Set([...fromSettings, ...fromWorkers])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [hostVars, selectedOrg, workers]);

  const hostWorkers = useMemo(() => {
    if (!selectedHost) return [];
    return workers
      .filter(
        (w) =>
          w.deployment.hostCompany === selectedHost &&
          (!selectedOrg || w.deployment.supervisingOrg === selectedOrg)
      )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, selectedHost, selectedOrg]);

  const computedTotal = useMemo(
    () => hostWorkers.reduce((sum, w) => sum + amountForFee(w, feeType), 0),
    [hostWorkers, feeType]
  );

  const [totalAmount, setTotalAmount] = useState<number>(invoice?.totalAmount ?? computedTotal);

  useEffect(() => {
    if (!isEdit) {
      setTotalAmount(computedTotal);
      if (selectedHost) {
        setBillingPeriod(periodForFee(feeType, selectedHost));
        setFormal((prev) => ({
          ...prev,
          subject: prev.subject || periodForFee(feeType, selectedHost),
        }));
      }
    }
  }, [computedTotal, selectedHost, feeType, isEdit]);

  const currency: MoneyCurrency =
    (invoice?.currency as MoneyCurrency | undefined) ||
    hostWorkers[0]?.financialConfig?.currency ||
    'JPY';
  const entrySymbol = currencySymbol(currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && (!selectedOrg || !selectedHost)) return;

    const payload: Partial<Invoice> = {
      supervisingOrg: selectedOrg,
      hostCompany: selectedHost,
      feeType,
      invoiceNo,
      billingPeriod,
      lastInvoiceDate,
      nextInvoiceDate,
      totalAmount,
      receiptSentDate: receiptSentDate || undefined,
      currency,
      notes,
      billedToAttn: formal.billedToAttn,
      subject: formal.subject,
      taxRate: formal.taxRate,
      bankAccountId: formal.bankAccountId,
    };

    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm';

  return (
    <div className="space-y-5">
      <div className="bento-card space-y-4 p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.cancel')}
          </button>
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <Receipt className="h-5 w-5 text-emerald-600" />
              {isEdit ? t('invoices.editTitle') : t('invoices.createTitle')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t('invoices.hostInvoiceHint')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bento-card max-w-3xl space-y-5 p-5 sm:p-6">
        {!isEdit ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.org')}
              </label>
              <select
                required
                value={selectedOrg}
                onChange={(e) => {
                  setSelectedOrg(e.target.value);
                  setSelectedHost('');
                }}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">—</option>
                {orgOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.host')}
              </label>
              <select
                required
                value={selectedHost}
                onChange={(e) => setSelectedHost(e.target.value)}
                disabled={!selectedOrg}
                className={`${inputClass} cursor-pointer disabled:opacity-60`}
              >
                <option value="">—</option>
                {hostOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div>
              <span className="text-slate-500">{t('workerModal.org')}:</span>{' '}
              <strong className="text-slate-900">{invoice?.supervisingOrg}</strong>
            </div>
            <div className="mt-0.5">
              <span className="text-slate-500">{t('workerModal.host')}:</span>{' '}
              <strong className="text-slate-900">{invoice?.hostCompany}</strong>
            </div>
            <div className="mt-0.5 text-slate-500">
              {t('invoices.workerCount')}:{' '}
              <span className="font-medium text-slate-700">
                {invoice?.workerCount ?? invoice?.lines?.length ?? 0}
              </span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">{t('invoices.feeType')}:</span>{' '}
          <strong className="text-slate-900">{feeLabel(t, feeType)}</strong>
        </div>

        {!isEdit && selectedHost && (
          <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-700 uppercase">
              <Building2 className="h-4 w-4" />
              {t('invoices.hostWorkers')} ({hostWorkers.length})
            </h4>
            {hostWorkers.length === 0 ? (
              <p className="text-[11px] text-amber-700">{t('invoices.hostWorkersEmpty')}</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                      <th className="px-3 py-2 font-semibold">{t('workers.colName')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{feeLabel(t, feeType)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hostWorkers.map((worker) => (
                      <tr key={worker.id} className="border-b border-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800">{worker.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {worker.serialNo} · {worker.passportNo}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {formatMoney(amountForFee(worker, feeType), worker.financialConfig.currency || 'JPY')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-600">
              {t('invoices.total')}: {formatMoney(computedTotal, currency)}
            </p>
          </div>
        )}

        {isEdit && (invoice?.lines?.length || 0) > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              {t('invoices.hostWorkers')} ({invoice?.lines?.length})
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2 font-semibold">{t('workers.colName')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{feeLabel(t, feeType)}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice?.lines?.map((line) => (
                    <tr key={line.id || line.workerId} className="border-b border-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{line.workerName}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {line.serialNo} · {line.passportNo}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">
                        {formatMoney(line.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.invoiceNo')} *
            </label>
            <input
              type="text"
              required
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.billingPeriod')}
            </label>
            <input
              type="text"
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{t('invoices.last')}</label>
            <input
              type="date"
              value={lastInvoiceDate}
              onChange={(e) => setLastInvoiceDate(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.invoiceDate')} *
            </label>
            <input
              type="date"
              required
              value={nextInvoiceDate}
              onChange={(e) => setNextInvoiceDate(e.target.value)}
              className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs font-bold text-amber-800 focus:border-amber-500 focus:outline-none sm:text-sm"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
            {t('invoices.amountSection')}
          </h4>
          <p className="text-[11px] text-slate-500">{t('invoices.hostInvoiceAmountHint')}</p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.subtotalExcl')} ({currency})
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold focus:border-blue-600 focus:outline-none sm:text-sm"
            />
            {displayCurrency !== currency && currency !== 'USD' && (
              <p className="mt-1 text-[11px] text-slate-500">
                Display ({displayCurrency}): {formatMoney(totalAmount, currency)} ({entrySymbol}
                {totalAmount.toLocaleString()})
              </p>
            )}
          </div>
        </div>

        <FormalInvoiceFields
          values={formal}
          onChange={setFormal}
          subtotal={totalAmount}
          currency={currency}
          inputClass={inputClass}
        />

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {t('invoices.receiptSentDate')}
          </label>
          <input
            type="date"
            value={receiptSentDate}
            onChange={(e) => setReceiptSentDate(e.target.value)}
            className={`${inputClass} max-w-xs`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">{t('workerModal.notes')}</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={
              saving ||
              (!isEdit && hostWorkers.length === 0) ||
              !formal.bankAccountId ||
              !formal.billedToAttn.trim() ||
              !formal.subject.trim()
            }
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? t('common.loading') : isEdit ? t('common.save') : t('invoices.createSubmit')}
          </button>
        </div>
      </form>
    </div>
  );
};
