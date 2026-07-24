import React, { useMemo, useState } from 'react';
import { StudentInvoice, Student } from '../types';
import { ArrowLeft, Receipt, Save } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { currencySymbol, type MoneyCurrency } from '../utils/currency';

interface StudentInvoiceFormPageProps {
  invoice: StudentInvoice | null;
  students: Student[];
  preferredStudentId?: string;
  onBack: () => void;
  onSave: (data: Partial<StudentInvoice>) => void | Promise<void>;
}

function defaultInvoiceNo() {
  return `STU-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
}

export const StudentInvoiceFormPage: React.FC<StudentInvoiceFormPageProps> = ({
  invoice,
  students,
  preferredStudentId,
  onBack,
  onSave,
}) => {
  const isEdit = !!invoice;
  const { t } = useLanguage();
  const { formatMoney, displayCurrency } = useCurrency();

  const [selectedStudentId, setSelectedStudentId] = useState(
    invoice?.studentId || preferredStudentId || students[0]?.id || ''
  );
  const [invoiceNo, setInvoiceNo] = useState(invoice?.invoiceNo || defaultInvoiceNo());
  const [billingPeriod, setBillingPeriod] = useState(
    invoice?.billingPeriod || 'Introduction Fee (One-time)'
  );
  const [lastInvoiceDate, setLastInvoiceDate] = useState(
    invoice?.lastInvoiceDate || new Date().toISOString().split('T')[0]
  );
  const [nextInvoiceDate, setNextInvoiceDate] = useState(
    invoice?.nextInvoiceDate || new Date().toISOString().split('T')[0]
  );
  const [receiptSentDate, setReceiptSentDate] = useState(invoice?.receiptSentDate || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [currency, setCurrency] = useState<MoneyCurrency>(invoice?.currency || 'JPY');
  const [saving, setSaving] = useState(false);

  const selectedStudent = useMemo(
    () =>
      students.find((student) => student.id === selectedStudentId) ||
      students.find((student) => student.id === invoice?.studentId),
    [students, selectedStudentId, invoice?.studentId]
  );

  const [totalAmount, setTotalAmount] = useState<number>(
    invoice?.totalAmount ?? Number(selectedStudent?.financialConfig?.introductionFee || 0)
  );

  const entrySymbol = currencySymbol(currency);

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = students.find((item) => item.id === studentId);
    if (student && !isEdit) {
      setTotalAmount(Number(student.financialConfig?.introductionFee || 0));
      setBillingPeriod('Introduction Fee (One-time)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<StudentInvoice> = {
      studentId: selectedStudentId,
      feeType: 'introduction',
      invoiceNo,
      billingPeriod,
      lastInvoiceDate,
      nextInvoiceDate,
      totalAmount,
      receiptSentDate: receiptSentDate || undefined,
      currency,
      notes,
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <p className="mt-1 text-xs text-slate-500">
                {t('students.introductionFee')} — {t('invoices.createHint')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bento-card max-w-3xl space-y-5 p-5 sm:p-6">
        {!isEdit ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('students.title')} *
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.serialNo}) - {student.deployment.hostCompany}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="text-slate-500">{t('students.title')}:</span>{' '}
            <strong className="text-slate-900">
              {invoice?.studentName} ({invoice?.passportNo})
            </strong>
            <div className="mt-0.5 text-slate-500">
              Host:{' '}
              <span className="font-medium text-slate-700">{invoice?.hostCompany}</span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">{t('invoices.feeType')}:</span>{' '}
          <strong className="text-slate-900">{t('students.introductionFee')}</strong>
          {selectedStudent && (
            <p className="mt-1 text-[11px] text-slate-500">
              Config: {formatMoney(selectedStudent.financialConfig.introductionFee || 0, 'JPY')}
            </p>
          )}
        </div>

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
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.last')}
            </label>
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
          <p className="text-[11px] text-slate-500">{t('invoices.amountHint')}</p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.currency')}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as MoneyCurrency)}
              className={`${inputClass} max-w-xs cursor-pointer`}
            >
              <option value="JPY">JPY</option>
              <option value="MMK">MMK</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.total')} ({currency})
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
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {t('workerModal.notes')}
          </label>
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
            disabled={saving}
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
