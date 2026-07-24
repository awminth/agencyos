import React, { useEffect, useState } from 'react';
import { Student, WorkerStatus } from '../types';
import { ArrowLeft, GraduationCap, PlaneTakeoff, DollarSign, Save } from 'lucide-react';
import { showWarning } from '../utils/swal';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface SystemVariable {
  id: string;
  category: string;
  value: string;
}

interface StudentFormPageProps {
  student: Student | null;
  onBack: () => void;
  onSave: (data: Partial<Student>) => void | Promise<void>;
}

export const StudentFormPage: React.FC<StudentFormPageProps> = ({ student, onBack, onSave }) => {
  const isEdit = !!student;
  const { t } = useLanguage();
  const { formatMoney, displayCurrency } = useCurrency();

  const [serialNo, setSerialNo] = useState(student?.serialNo || '');
  const [name, setName] = useState(student?.name || '');
  const [gender, setGender] = useState<'Male' | 'Female'>(student?.gender || 'Male');
  const [dob, setDob] = useState(student?.dob || '2000-01-01');
  const [passportNo, setPassportNo] = useState(student?.passportNo || '');
  const [status, setStatus] = useState<WorkerStatus>(student?.status || 'Active');
  const [abscondedDate, setAbscondedDate] = useState(student?.abscondedDate || '');
  const [notes, setNotes] = useState(student?.notes || '');

  const [visaType, setVisaType] = useState(student?.deployment?.visaType || '');
  const [supervisingOrg, setSupervisingOrg] = useState(student?.deployment?.supervisingOrg || '');
  const [hostCompany, setHostCompany] = useState(student?.deployment?.hostCompany || '');
  const [jobCategory, setJobCategory] = useState(student?.deployment?.jobCategory || '');
  const [ownCardDate, setOwnCardDate] = useState(student?.deployment?.ownCardDate || '');
  const [departureDate, setDepartureDate] = useState(student?.deployment?.departureDate || '');
  const [japanEntryDate, setJapanEntryDate] = useState(student?.deployment?.japanEntryDate || '');
  const [contractEndDate, setContractEndDate] = useState(student?.deployment?.contractEndDate || '');

  const [introductionFee, setIntroductionFee] = useState<number>(
    student?.financialConfig?.introductionFee || 100000
  );

  const [visaOptions, setVisaOptions] = useState<string[]>([]);
  const [orgOptions, setOrgOptions] = useState<string[]>([]);
  const [hostOptions, setHostOptions] = useState<string[]>([]);
  const [jobOptions, setJobOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/variables?activeOnly=1')
      .then((r) => r.json())
      .then((rows: SystemVariable[]) => {
        if (!Array.isArray(rows)) return;
        setVisaOptions(rows.filter((v) => v.category === 'visa_type').map((v) => v.value));
        setOrgOptions(rows.filter((v) => v.category === 'supervising_org').map((v) => v.value));
        setHostOptions(rows.filter((v) => v.category === 'host_company').map((v) => v.value));
        setJobOptions(rows.filter((v) => v.category === 'job_category').map((v) => v.value));
      })
      .catch(() => undefined);
  }, []);

  const withCurrent = (options: string[], current: string) => {
    if (current && !options.includes(current)) return [current, ...options];
    return options;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      await showWarning(t('students.incompleteTitle'), t('students.nameRequired'));
      return;
    }
    if (!visaType || !supervisingOrg || !hostCompany || !jobCategory) {
      await showWarning(t('students.incompleteTitle'), t('students.dropdownRequired'));
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
          introductionFee,
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
              <GraduationCap className="h-5 w-5 text-blue-600" />
              {isEdit ? t('students.editTitle') : t('students.createTitle')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isEdit ? t('students.editHint') : t('students.createHint')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bento-card space-y-6 p-5 sm:p-6">
        <div className="space-y-3">
          <h4 className="text-xs font-bold tracking-wider text-blue-600 uppercase">
            {t('students.sectionProfile')}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.serial')}
              </label>
              <input
                type="text"
                placeholder="e.g. S-2026-001"
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
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('workerModal.dob')}
              </label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
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
                {t('common.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkerStatus)}
                className={selectClass}
              >
                <option value="Active">Active</option>
                <option value="Contract Ended">Contract Ended</option>
                <option value="Absconded">Absconded</option>
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
            {t('students.sectionDeployment')}
          </h4>
          <p className="text-[11px] text-slate-500">{t('workerModal.dropdownHint')}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                ['visa', visaType, setVisaType, visaOptions],
                ['org', supervisingOrg, setSupervisingOrg, orgOptions],
                ['host', hostCompany, setHostCompany, hostOptions],
                ['job', jobCategory, setJobCategory, jobOptions],
              ] as const
            ).map(([key, value, setter, options]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {t(`workerModal.${key}`)}
                </label>
                <select
                  required
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {withCurrent(options, value).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ))}
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
            {t('students.sectionFinancial')}
          </h4>
          <p className="text-[11px] text-slate-500">{t('students.financialHint')}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('students.introductionFee')} (JPY)
              </label>
              <input
                type="number"
                value={introductionFee}
                onChange={(e) => setIntroductionFee(Number(e.target.value))}
                className={`${inputClass} font-mono`}
              />
              {displayCurrency === 'MMK' && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  {formatMoney(introductionFee, 'JPY')}
                </p>
              )}
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
