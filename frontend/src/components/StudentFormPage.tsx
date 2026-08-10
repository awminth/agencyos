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
  const [schoolName, setSchoolName] = useState(student?.deployment?.supervisingOrg || '');
  const [schoolAddress, setSchoolAddress] = useState(student?.deployment?.hostCompany || '');
  const [departureDate, setDepartureDate] = useState(student?.deployment?.departureDate || '');
  const [japanEntryDate, setJapanEntryDate] = useState(student?.deployment?.japanEntryDate || '');

  const [introductionFee, setIntroductionFee] = useState<number>(
    student?.financialConfig?.introductionFee || 100000
  );

  const [visaOptions, setVisaOptions] = useState<string[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/variables?activeOnly=1')
      .then((r) => r.json())
      .then((rows: SystemVariable[]) => {
        if (!Array.isArray(rows)) return;
        setVisaOptions(rows.filter((v) => v.category === 'visa_type').map((v) => v.value));
        setSchoolOptions(rows.filter((v) => v.category === 'school_name').map((v) => v.value));
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
    if (!visaType || !schoolName || !schoolAddress.trim()) {
      await showWarning(t('students.incompleteTitle'), t('students.fieldsRequired'));
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
          supervisingOrg: schoolName,
          hostCompany: schoolAddress.trim(),
          jobCategory: '',
          ownCardDate: '',
          departureDate,
          japanEntryDate,
          contractEndDate: '',
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
          <p className="text-[11px] text-slate-500">{t('students.visaHint')}</p>
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
                <option value="">—</option>
                {withCurrent(visaOptions, visaType).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('students.schoolName')} *
              </label>
              <select
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={selectClass}
              >
                <option value="">—</option>
                {withCurrent(schoolOptions, schoolName).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('students.schoolAddress')} *
              </label>
              <input
                type="text"
                required
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
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
