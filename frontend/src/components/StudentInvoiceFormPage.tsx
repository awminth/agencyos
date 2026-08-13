import React, { useEffect, useMemo, useState } from 'react';
import { StudentInvoice, Student } from '../types';
import { ArrowLeft, Receipt, Save, GraduationCap } from 'lucide-react';
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
}

interface StudentInvoiceFormPageProps {
  invoice: StudentInvoice | null;
  students: Student[];
  preferredSchoolName?: string;
  onBack: () => void;
  onSave: (data: Partial<StudentInvoice>) => void | Promise<void>;
}

function defaultInvoiceNo() {
  return `STU-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
}

export const StudentInvoiceFormPage: React.FC<StudentInvoiceFormPageProps> = ({
  invoice,
  students,
  preferredSchoolName,
  onBack,
  onSave,
}) => {
  const isEdit = !!invoice;
  const { t } = useLanguage();
  const { formatMoney, displayCurrency } = useCurrency();

  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState(
    invoice?.schoolName || invoice?.supervisingOrg || preferredSchoolName || ''
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
        const fromSettings = rows
          .filter((v) => v.category === 'school_name')
          .map((v) => v.value);
        const fromStudents = Array.from(
          new Set(
            students
              .map((s) => s.deployment.supervisingOrg)
              .filter((name): name is string => Boolean(name?.trim()))
          )
        );
        const merged = Array.from(new Set([...fromSettings, ...fromStudents])).sort((a, b) =>
          a.localeCompare(b)
        );
        setSchoolOptions(merged);
        if (!selectedSchool && merged.length > 0 && !isEdit) {
          setSelectedSchool(preferredSchoolName || merged[0]);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const schoolStudents = useMemo(() => {
    if (!selectedSchool) return [];
    return students
      .filter((s) => s.deployment.supervisingOrg === selectedSchool)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedSchool]);

  const computedTotal = useMemo(
    () =>
      schoolStudents.reduce(
        (sum, s) => sum + Number(s.financialConfig?.introductionFee || 0),
        0
      ),
    [schoolStudents]
  );

  const [totalAmount, setTotalAmount] = useState<number>(
    invoice?.totalAmount ?? computedTotal
  );

  useEffect(() => {
    if (!isEdit) {
      setTotalAmount(computedTotal);
      if (selectedSchool) {
        const period = `Introduction Fee — ${selectedSchool}`;
        setBillingPeriod(period);
        setFormal((prev) => ({
          ...prev,
          subject: prev.subject || period,
        }));
      }
    }
  }, [computedTotal, selectedSchool, isEdit]);

  const entrySymbol = currencySymbol(currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !selectedSchool) return;

    const payload: Partial<StudentInvoice> = {
      schoolName: selectedSchool,
      supervisingOrg: selectedSchool,
      feeType: 'introduction',
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
                {t('students.schoolInvoiceHint')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bento-card max-w-3xl space-y-5 p-5 sm:p-6">
        {!isEdit ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('students.schoolName')} *
            </label>
            <select
              required
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">—</option>
              {schoolOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="text-slate-500">{t('students.schoolName')}:</span>{' '}
            <strong className="text-slate-900">{invoice?.schoolName || invoice?.supervisingOrg}</strong>
            <div className="mt-0.5 text-slate-500">
              {t('students.studentCount')}:{' '}
              <span className="font-medium text-slate-700">
                {invoice?.studentCount ?? invoice?.lines?.length ?? 0}
              </span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-500">{t('invoices.feeType')}:</span>{' '}
          <strong className="text-slate-900">{t('students.introductionFee')}</strong>
        </div>

        {!isEdit && selectedSchool && (
          <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-700 uppercase">
              <GraduationCap className="h-4 w-4" />
              {t('students.schoolStudents')} ({schoolStudents.length})
            </h4>
            {schoolStudents.length === 0 ? (
              <p className="text-[11px] text-amber-700">{t('students.schoolStudentsEmpty')}</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                      <th className="px-3 py-2 font-semibold">{t('workers.colName')}</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        {t('students.introductionFee')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolStudents.map((student) => (
                      <tr key={student.id} className="border-b border-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800">{student.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {student.serialNo} · {student.passportNo}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {formatMoney(student.financialConfig?.introductionFee || 0, 'JPY')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-600">
              {t('invoices.total')}: {formatMoney(computedTotal, 'JPY')}
            </p>
          </div>
        )}

        {isEdit && (invoice?.lines?.length || 0) > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold tracking-wider text-slate-600 uppercase">
              {t('students.schoolStudents')} ({invoice?.lines?.length})
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2 font-semibold">{t('workers.colName')}</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      {t('students.introductionFee')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice?.lines?.map((line) => (
                    <tr key={line.id || line.studentId} className="border-b border-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{line.studentName}</div>
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
          <p className="text-[11px] text-slate-500">{t('students.schoolInvoiceAmountHint')}</p>
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
            disabled={
              saving ||
              (!isEdit && schoolStudents.length === 0) ||
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
