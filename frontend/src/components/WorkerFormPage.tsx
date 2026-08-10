import React, { useEffect, useState } from 'react';
import { Worker, WorkerStatus } from '../types';
import { ArrowLeft, User, PlaneTakeoff, DollarSign, Save } from 'lucide-react';
import { showWarning } from '../utils/swal';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import type { MoneyCurrency } from '../utils/currency';

interface SystemVariable {
  id: string;
  category: string;
  value: string;
  parentValue?: string | null;
}

interface WorkerFormPageProps {
  worker: Worker | null;
  onBack: () => void;
  onSave: (data: Partial<Worker>) => void | Promise<void>;
}

export const WorkerFormPage: React.FC<WorkerFormPageProps> = ({ worker, onBack, onSave }) => {
  const isEdit = !!worker;
  const { t } = useLanguage();
  const { formatMoney, displayCurrency } = useCurrency();

  const [serialNo, setSerialNo] = useState(worker?.serialNo || '');
  const [name, setName] = useState(worker?.name || '');
  const [gender, setGender] = useState<'Male' | 'Female'>(worker?.gender || 'Male');
  const [dob, setDob] = useState(worker?.dob || '2000-01-01');
  const [passportNo, setPassportNo] = useState(worker?.passportNo || '');
  const [status, setStatus] = useState<WorkerStatus>(worker?.status || 'Active');
  const [abscondedDate, setAbscondedDate] = useState(worker?.abscondedDate || '');
  const [notes, setNotes] = useState(worker?.notes || '');

  const [visaType, setVisaType] = useState(worker?.deployment?.visaType || '');
  const [supervisingOrg, setSupervisingOrg] = useState(worker?.deployment?.supervisingOrg || '');
  const [hostCompany, setHostCompany] = useState(worker?.deployment?.hostCompany || '');
  const [jobCategory, setJobCategory] = useState(worker?.deployment?.jobCategory || '');
  const [ownCardDate, setOwnCardDate] = useState(worker?.deployment?.ownCardDate || '');
  const [departureDate, setDepartureDate] = useState(worker?.deployment?.departureDate || '');
  const [japanEntryDate, setJapanEntryDate] = useState(worker?.deployment?.japanEntryDate || '');
  const [contractEndDate, setContractEndDate] = useState(worker?.deployment?.contractEndDate || '');

  const [feeCurrency, setFeeCurrency] = useState<MoneyCurrency>(
    worker?.financialConfig?.currency || 'JPY'
  );
  const [flightFee, setFlightFee] = useState<number>(worker?.financialConfig?.flightFee || 150000);
  const [trainingFee, setTrainingFee] = useState<number>(worker?.financialConfig?.trainingFee || 250000);
  const [managementFee, setManagementFee] = useState<number>(
    worker?.financialConfig?.managementFee || 30000
  );
  const [billingCycleMonths, setBillingCycleMonths] = useState<number>(
    worker?.financialConfig?.billingCycleMonths || 6
  );

  const [visaOptions, setVisaOptions] = useState<string[]>([]);
  const [orgOptions, setOrgOptions] = useState<string[]>([]);
  const [hostVars, setHostVars] = useState<SystemVariable[]>([]);
  const [jobOptions, setJobOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/variables?activeOnly=1')
      .then((r) => r.json())
      .then((rows: SystemVariable[]) => {
        if (!Array.isArray(rows)) return;
        setVisaOptions(rows.filter((v) => v.category === 'visa_type').map((v) => v.value));
        setOrgOptions(rows.filter((v) => v.category === 'supervising_org').map((v) => v.value));
        setHostVars(rows.filter((v) => v.category === 'host_company'));
        setJobOptions(rows.filter((v) => v.category === 'job_category').map((v) => v.value));
      })
      .catch(() => undefined);
  }, []);

  const withCurrent = (options: string[], current: string) => {
    if (current && !options.includes(current)) return [current, ...options];
    return options;
  };

  const hostOptions = (() => {
    const filtered = supervisingOrg
      ? hostVars
          .filter((v) => !v.parentValue || v.parentValue === supervisingOrg)
          .map((v) => v.value)
      : hostVars.map((v) => v.value);
    return withCurrent(filtered, hostCompany);
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      await showWarning(t('workerModal.incompleteTitle'), t('workerModal.nameRequired'));
      return;
    }
    if (!visaType || !supervisingOrg || !hostCompany || !jobCategory) {
      await showWarning(t('workerModal.incompleteTitle'), t('workerModal.dropdownRequired'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        serialNo,
        name,
        gender,
        dob,
        passportNo,
        status,
        abscondedDate: status === 'Absconded' ? abscondedDate : undefined,
        notes,
        deployment: {
          visaType,
          supervisingOrg,
          hostCompany,
          jobCategory,
          ownCardDate,
          departureDate,
          japanEntryDate,
          contractEndDate,
        },
        financialConfig: {
          flightFee,
          trainingFee,
          managementFee,
          billingCycleMonths,
          currency: feeCurrency,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    'w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm';
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm';

  return (
    <div className="space-y-5">
      <div className="bento-card p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('invoices.back')}
          </button>
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <User className="h-5 w-5 text-blue-600" />
              {isEdit ? t('workerModal.editTitle') : t('workerModal.addTitle')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isEdit ? t('workerModal.editHint') : t('workerModal.createHint')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bento-card space-y-6 p-5 sm:p-6">
        <div className="space-y-3">
          <h4 className="text-xs font-bold tracking-wider text-blue-600 uppercase">
            {t('workerModal.section1')}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.serial')}
              </label>
              <input
                type="text"
                placeholder="e.g. W-2024-006"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.name')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.gender')}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                className={selectClass}
              >
                <option value="Male">{t('common.male')}</option>
                <option value="Female">{t('common.female')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.dob')}
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.passport')}
              </label>
              <input
                type="text"
                required
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkerStatus)}
                className={selectClass}
              >
                <option value="Active">{t('status.active')}</option>
                <option value="Contract Ended">{t('status.ended')}</option>
                <option value="Absconded">{t('status.absconded')}</option>
              </select>
            </div>
          </div>
          {status === 'Absconded' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-red-600">
                {t('workerModal.abscondedDate')}
              </label>
              <input
                type="date"
                value={abscondedDate}
                onChange={(e) => setAbscondedDate(e.target.value)}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs focus:border-red-500 focus:outline-none sm:text-sm"
              />
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-600 uppercase">
            <PlaneTakeoff className="h-4 w-4" />
            {t('workerModal.section2')}
          </h4>
          <p className="text-[11px] text-slate-500">{t('workerModal.dropdownHint')}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.visa')}
              </label>
              <select
                required
                value={visaType}
                onChange={(e) => setVisaType(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('common.select')}</option>
                {withCurrent(visaOptions, visaType).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.org')}
              </label>
              <select
                required
                value={supervisingOrg}
                onChange={(e) => {
                  setSupervisingOrg(e.target.value);
                  setHostCompany('');
                }}
                className={selectClass}
              >
                <option value="">{t('common.select')}</option>
                {withCurrent(orgOptions, supervisingOrg).map((v) => (
                  <option key={v} value={v}>
                    {v}
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
                value={hostCompany}
                onChange={(e) => setHostCompany(e.target.value)}
                className={selectClass}
                disabled={!supervisingOrg}
              >
                <option value="">{t('common.select')}</option>
                {hostOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.job')}
              </label>
              <select
                required
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('common.select')}</option>
                {withCurrent(jobOptions, jobCategory).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.ownCard')}
              </label>
              <input
                type="date"
                value={ownCardDate}
                onChange={(e) => setOwnCardDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.departure')}
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.entry')}
              </label>
              <input
                type="date"
                value={japanEntryDate}
                onChange={(e) => setJapanEntryDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.contractEnd')}
              </label>
              <input
                type="date"
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-blue-600 uppercase">
            <DollarSign className="h-4 w-4" />
            {t('workerModal.section3')}
          </h4>
          <p className="text-[11px] text-slate-500">{t('workerModal.financialHint')}</p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.currency')} *
            </label>
            <select
              value={feeCurrency}
              onChange={(e) => setFeeCurrency(e.target.value as MoneyCurrency)}
              className={`${selectClass} max-w-xs`}
            >
              <option value="JPY">JPY</option>
              <option value="MMK">MMK</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.flightFee')} ({feeCurrency})
              </label>
              <input
                type="number"
                value={flightFee}
                onChange={(e) => setFlightFee(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
              {displayCurrency !== feeCurrency && feeCurrency !== 'USD' && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  {formatMoney(flightFee, feeCurrency)}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.trainingFee')} ({feeCurrency})
              </label>
              <input
                type="number"
                value={trainingFee}
                onChange={(e) => setTrainingFee(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
              {displayCurrency !== feeCurrency && feeCurrency !== 'USD' && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  {formatMoney(trainingFee, feeCurrency)}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.managementFee')} ({feeCurrency})
              </label>
              <input
                type="number"
                value={managementFee}
                onChange={(e) => setManagementFee(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
              {displayCurrency !== feeCurrency && feeCurrency !== 'USD' && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  {formatMoney(managementFee, feeCurrency)}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.billingCycle')}
              </label>
              <input
                type="number"
                value={billingCycleMonths}
                onChange={(e) => setBillingCycleMonths(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
            </div>
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
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? t('common.loading') : isEdit ? t('common.edit') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};
