import React from 'react';
import { Worker, Invoice } from '../types';
import { X, User, PlaneTakeoff, Receipt, DollarSign, Edit } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import type { MoneyCurrency } from '../utils/currency';

interface WorkerDetailModalProps {
  worker: Worker;
  invoices: Invoice[];
  onClose: () => void;
  onEdit: (worker: Worker) => void;
}

function feeTypeLabel(feeType: string | undefined, t: (key: string) => string) {
  if (feeType === 'flight') return t('workerModal.flightFee');
  if (feeType === 'training') return t('workerModal.trainingFee');
  return t('workerModal.managementFee');
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'Active') return t('status.active');
  if (status === 'Contract Ended') return t('status.ended');
  if (status === 'Absconded') return t('status.absconded');
  if (status === 'Paid') return t('status.paid');
  if (status === 'Partial') return t('status.partial');
  if (status === 'Pending') return t('status.pending');
  if (status === 'Overdue') return t('status.overdue');
  return status;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  worker,
  invoices,
  onClose,
  onEdit,
}) => {
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const money = (amount: number, currency?: string) =>
    formatMoney(amount, (currency as MoneyCurrency) || 'JPY');
  const workerInvoices = invoices.filter((i) => i.workerId === worker.id);
  const notAvailable = t('workerDetail.notAvailable');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-xs sm:p-4">
      <div className="bento-card flex max-h-[min(100dvh,100%)] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                <span className="truncate">{worker.name}</span>
                <span className="font-mono text-xs text-blue-600">({worker.serialNo})</span>
              </h3>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {t('workerDetail.passport')}: {worker.passportNo} | {t('workerDetail.dob')}:{' '}
                {worker.dob} ({worker.gender === 'Male' ? t('common.male') : t('common.female')})
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(worker);
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
                  worker.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : worker.status === 'Contract Ended'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {statusLabel(worker.status, t)}
              </span>
            </div>

            {worker.status === 'Absconded' && worker.abscondedDate && (
              <div className="text-xs font-bold text-red-600">
                {t('workerDetail.abscondedDate')}: {worker.abscondedDate}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-600 uppercase">
              <PlaneTakeoff className="h-4 w-4" />
              <span>{t('workerDetail.deploymentInfo')}</span>
            </h4>

            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div>
                <span className="block text-slate-500">{t('workerModal.visa')}:</span>
                <span className="font-bold text-blue-700">{worker.deployment.visaType}</span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.job')}:</span>
                <span className="font-semibold break-words text-slate-800">
                  {worker.deployment.jobCategory}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.host')}:</span>
                <span className="font-semibold break-words text-slate-800">
                  {worker.deployment.hostCompany}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.org')}:</span>
                <span className="break-words text-slate-700">
                  {worker.deployment.supervisingOrg}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.ownCard')}:</span>
                <span className="font-mono text-slate-700">
                  {worker.deployment.ownCardDate || notAvailable}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.departure')}:</span>
                <span className="font-mono text-slate-700">
                  {worker.deployment.departureDate || notAvailable}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.entry')}:</span>
                <span className="font-mono text-slate-700">
                  {worker.deployment.japanEntryDate || notAvailable}
                </span>
              </div>
              <div>
                <span className="block text-slate-500">{t('workerModal.contractEnd')}:</span>
                <span className="font-mono font-bold text-amber-700">
                  {worker.deployment.contractEndDate || notAvailable}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <DollarSign className="h-4 w-4" />
              <span>{t('workerDetail.financialInfo')}</span>
            </h4>
            <p className="text-[11px] text-slate-500">{t('workerDetail.financialHint')}</p>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-500">{t('workerModal.flightFee')}</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(worker.financialConfig?.flightFee || 0, worker.financialConfig?.currency || 'JPY')}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-500">{t('workerModal.trainingFee')}</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(worker.financialConfig?.trainingFee || 0, worker.financialConfig?.currency || 'JPY')}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-500">{t('workerModal.managementFee')}</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(worker.financialConfig?.managementFee || 0, worker.financialConfig?.currency || 'JPY')}
                </span>
                <span className="mt-1 block text-[10px] text-slate-500">
                  {t('workerDetail.billingCycle', {
                    months: worker.financialConfig?.billingCycleMonths || 6,
                  })}
                </span>
              </div>
            </div>

            <h4 className="flex items-center gap-1.5 pt-2 text-xs font-bold tracking-wider text-emerald-700 uppercase">
              <Receipt className="h-4 w-4" />
              <span>{t('workerDetail.invoicesTitle', { count: workerInvoices.length })}</span>
            </h4>

            {workerInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 italic">{t('workerDetail.noInvoices')}</p>
            ) : (
              <div className="space-y-2">
                {workerInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900">{inv.invoiceNo}</div>
                      <div className="text-[11px] text-slate-500">
                        {feeTypeLabel(inv.feeType, t)} · {inv.billingPeriod}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-slate-700">
                        {t('invoices.total')}: {money(inv.totalAmount, inv.currency)}
                      </div>
                      <div className="font-bold text-amber-700">
                        {t('invoices.outstanding')}: {money(inv.outstandingAmount, inv.currency)}
                      </div>
                    </div>
                    <span
                      className={`status-badge shrink-0 text-[10px] font-bold ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {statusLabel(inv.status, t)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {worker.notes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <span className="mb-1 block font-bold text-slate-500">
                {t('workerDetail.notesTitle')} ({t('workerModal.notes')}):
              </span>
              <p className="break-words text-slate-700">{worker.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
