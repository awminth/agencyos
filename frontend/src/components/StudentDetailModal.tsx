import React from 'react';
import { Student, StudentInvoice } from '../types';
import { X, GraduationCap, PlaneTakeoff, DollarSign, Edit, Receipt } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import type { MoneyCurrency } from '../utils/currency';

interface StudentDetailModalProps {
  student: Student;
  invoices: StudentInvoice[];
  onClose: () => void;
  onEdit: (student: Student) => void;
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'Active') return t('status.active');
  if (status === 'Contract Ended') return t('status.ended');
  if (status === 'Absconded') return t('status.absconded');
  return status;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  invoices,
  onClose,
  onEdit,
}) => {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const money = (amount: number, currency?: string) =>
    formatMoney(amount, (currency as MoneyCurrency) || 'JPY');
  const studentInvoices = invoices.filter(
    (invoice) =>
      invoice.studentId === student.id ||
      invoice.lines?.some((line) => line.studentId === student.id)
  );
  const totalBilled = studentInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const totalPaid = studentInvoices.reduce((sum, invoice) => sum + (invoice.amountReceived || 0), 0);
  const totalRemain = studentInvoices.reduce(
    (sum, invoice) => sum + (invoice.outstandingAmount || 0),
    0
  );
  const notAvailable = t('workerDetail.notAvailable');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-xs sm:p-4">
      <div className="bento-card flex max-h-[min(100dvh,100%)] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                <span className="truncate">{student.name}</span>
                <span className="font-mono text-xs text-blue-600">({student.serialNo})</span>
              </h3>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {t('workerDetail.passport')}: {student.passportNo} | {t('workerDetail.dob')}:{' '}
                {student.dob} ({student.gender === 'Male' ? t('common.male') : t('common.female')})
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 sm:px-3.5"
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('workerDetail.edit')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-slate-800"
              aria-label={t('workerDetail.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <span className="text-xs text-slate-500">{t('workerDetail.currentStatus')}:</span>
              <span
                className={`status-badge ml-2 inline-block text-xs font-bold ${
                  student.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : student.status === 'Contract Ended'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {statusLabel(student.status, t)}
              </span>
            </div>
            {student.status === 'Absconded' && student.abscondedDate && (
              <div className="text-xs font-bold text-red-600">
                {t('workerDetail.abscondedDate')}: {student.abscondedDate}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-600 uppercase">
              <PlaneTakeoff className="h-4 w-4" />
              <span>{t('students.sectionDeployment')}</span>
            </h4>

            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div>
                <span className="block text-slate-500">{t('workerModal.visa')}:</span>
                <span className="font-bold text-blue-700">{student.deployment.visaType || notAvailable}</span>
              </div>
              <div>
                <span className="block text-slate-500">{t('students.schoolName')}:</span>
                <span className="font-semibold break-words text-slate-800">
                  {student.deployment.supervisingOrg || notAvailable}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="block text-slate-500">{t('students.schoolAddress')}:</span>
                <span className="break-words text-slate-700">
                  {student.deployment.hostCompany || notAvailable}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.departure')}:</span>
                <span className="font-mono text-slate-700">
                  {student.deployment.departureDate || notAvailable}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.entry')}:</span>
                <span className="font-mono text-slate-700">
                  {student.deployment.japanEntryDate || notAvailable}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <DollarSign className="h-4 w-4" />
              <span>{t('students.sectionFinancial')}</span>
            </h4>
            <p className="text-[11px] text-slate-500">{t('students.financialHint')}</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-500">{t('students.introductionFee')}</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(student.financialConfig?.introductionFee || 0, 'JPY')}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-500">{t('invoices.totalAmount')}</span>
                <span className="font-mono font-bold text-slate-900">{money(totalBilled)}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-500">{t('invoices.totalPaid')}</span>
                <span className="font-mono font-bold text-emerald-700">{money(totalPaid)}</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-500">{t('invoices.remainAmount')}</span>
                <span className="font-mono font-bold text-amber-700">{money(totalRemain)}</span>
              </div>
            </div>

            <h4 className="flex items-center gap-1.5 pt-2 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <Receipt className="h-4 w-4" />
              <span>{t('students.feesTitle')}</span>
            </h4>

            {studentInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 italic">{t('students.feesEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {studentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900">{invoice.invoiceNo}</div>
                      <div className="text-[11px] text-slate-500">{invoice.billingPeriod}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-slate-700">
                        {t('invoices.total')}: {money(invoice.totalAmount, invoice.currency)}
                      </div>
                      <div className="font-bold text-amber-700">
                        {t('invoices.outstanding')}: {money(invoice.outstandingAmount, invoice.currency)}
                      </div>
                    </div>
                    <span
                      className={`status-badge shrink-0 text-[10px] font-bold ${
                        invoice.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : invoice.status === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {student.notes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <span className="mb-1 block font-bold text-slate-500">
                {t('workerDetail.notesTitle')} ({t('workerModal.notes')}):
              </span>
              <p className="break-words text-slate-700">{student.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
