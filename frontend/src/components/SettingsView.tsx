import React, { useEffect, useState } from 'react';
import {
  Settings,
  Printer,
  ListTree,
  Plus,
  Trash2,
  Save,
  Upload,
  Image as ImageIcon,
  Users as UsersIcon,
  Coins,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { ExportButtons } from './ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { formatMoneyValue } from '../utils/currency';
import { UserAccountsView } from './UserAccountsView';
import { AuthUser } from '../types';
import { can } from '../utils/permissions';
import { confirmDelete, showError, showSuccess } from '../utils/swal';
import type { DisplayCurrency } from '../utils/currency';
import { TablePagination, usePagination } from './TablePagination';

type VariableCategory =
  | 'visa_type'
  | 'supervising_org'
  | 'host_company'
  | 'job_category';

interface PrintSettings {
  agencyName: string;
  address: string;
  phone: string;
  logoData: string | null;
}

interface SystemVariable {
  id: string;
  category: VariableCategory;
  value: string;
  sortOrder: number;
  isActive: boolean;
}

const CATEGORIES: { id: VariableCategory; labelKey: string }[] = [
  { id: 'visa_type', labelKey: 'settings.catVisa' },
  { id: 'supervising_org', labelKey: 'settings.catOrg' },
  { id: 'host_company', labelKey: 'settings.catHost' },
  { id: 'job_category', labelKey: 'settings.catJob' },
];

export const SettingsView: React.FC<{ currentUser: AuthUser }> = ({ currentUser }) => {
  const { t } = useLanguage();
  const {
    jpyToMmkRate,
    displayCurrency,
    saveSettings: saveCurrencySettings,
    refresh: refreshCurrency,
  } = useCurrency();
  const canUsers = can(currentUser.permissions, 'users', 'read');
  const canSettingsUpdate = can(currentUser.permissions, 'settings', 'update');
  const canSettingsCreate = can(currentUser.permissions, 'settings', 'create');
  const canSettingsDelete = can(currentUser.permissions, 'settings', 'delete');
  const [tab, setTab] = useState<'print' | 'currency' | 'variables' | 'users'>(
    canUsers && !can(currentUser.permissions, 'settings', 'read') ? 'users' : 'print'
  );

  const [printForm, setPrintForm] = useState<PrintSettings>({
    agencyName: '',
    address: '',
    phone: '',
    logoData: null,
  });
  const [printSaving, setPrintSaving] = useState(false);
  const [printMsg, setPrintMsg] = useState('');

  const [rateInput, setRateInput] = useState(String(jpyToMmkRate));
  const [displayInput, setDisplayInput] = useState<DisplayCurrency>(displayCurrency);
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencyMsg, setCurrencyMsg] = useState('');

  const [variables, setVariables] = useState<SystemVariable[]>([]);
  const [activeCategory, setActiveCategory] = useState<VariableCategory>('visa_type');
  const [newValue, setNewValue] = useState('');
  const [varMsg, setVarMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, vRes] = await Promise.all([
        fetch('/api/settings/print').then((r) => r.json()),
        fetch('/api/settings/variables').then((r) => r.json()),
      ]);
      setPrintForm({
        agencyName: pRes.agencyName || '',
        address: pRes.address || '',
        phone: pRes.phone || '',
        logoData: pRes.logoData || null,
      });
      setVariables(Array.isArray(vRes) ? vRes : []);
    } catch {
      setPrintMsg(t('settings.loadFail'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setRateInput(String(jpyToMmkRate));
    setDisplayInput(displayCurrency);
  }, [jpyToMmkRate, displayCurrency]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPrintMsg(t('settings.logoTooBig'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPrintForm((prev) => ({ ...prev, logoData: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const savePrint = async () => {
    setPrintSaving(true);
    setPrintMsg('');
    try {
      const res = await fetch('/api/settings/print', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setPrintForm({
        agencyName: data.agencyName || '',
        address: data.address || '',
        phone: data.phone || '',
        logoData: data.logoData || null,
      });
      setPrintMsg(t('settings.printSaved'));
    } catch {
      setPrintMsg(t('settings.printSaveFail'));
    } finally {
      setPrintSaving(false);
    }
  };

  const saveCurrency = async () => {
    setCurrencySaving(true);
    setCurrencyMsg('');
    const rate = Number(rateInput);
    if (!Number.isFinite(rate) || rate <= 0) {
      setCurrencyMsg(t('settings.rateInvalid'));
      setCurrencySaving(false);
      return;
    }
    try {
      await saveCurrencySettings({
        jpyToMmkRate: rate,
        displayCurrency: displayInput,
      });
      await refreshCurrency();
      setCurrencyMsg(t('settings.currencySaved'));
      await showSuccess(t('settings.currencySaved'));
    } catch {
      setCurrencyMsg(t('settings.currencySaveFail'));
    } finally {
      setCurrencySaving(false);
    }
  };

  const filteredVars = variables.filter((v) => v.category === activeCategory);
  const {
    page: varPage,
    setPage: setVarPage,
    pageSize: varPageSize,
    setPageSize: setVarPageSize,
    totalPages: varTotalPages,
    pagedItems: pagedVars,
    from: varFrom,
    to: varTo,
    total: varTotal,
  } = usePagination(filteredVars, 10);

  const addVariable = async () => {
    setVarMsg('');
    if (!newValue.trim()) return;
    try {
      const res = await fetch('/api/settings/variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          value: newValue.trim(),
          sortOrder: filteredVars.length + 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setVariables((prev) => [...prev, data]);
      setNewValue('');
      setVarMsg(t('settings.varAdded'));
    } catch {
      setVarMsg(t('settings.varAddFail'));
    }
  };

  const removeVariable = async (id: string) => {
    const ok = await confirmDelete({
      title: t('common.delete') + '?',
      text: t('settings.variablesHint'),
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/settings/variables/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      setVariables((prev) => prev.filter((v) => v.id !== id));
      await showSuccess(t('common.delete'));
    } catch (err: any) {
      setVarMsg(t('settings.varAddFail'));
      await showError(t('settings.varAddFail'), err?.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500">
        {t('common.loading')}
      </div>
    );
  }

  const categoryLabel = (cat: VariableCategory) =>
    t(CATEGORIES.find((c) => c.id === cat)?.labelKey || 'settings.catVisa');

  const previewRate = Number(rateInput) > 0 ? Number(rateInput) : jpyToMmkRate;
  const previewJpy = formatMoneyValue(150000, {
    from: 'JPY',
    displayCurrency: 'JPY',
    jpyToMmkRate: previewRate,
  });
  const previewMmk = formatMoneyValue(150000, {
    from: 'JPY',
    displayCurrency: 'MMK',
    jpyToMmkRate: previewRate,
  });

  const settingsHeaders = ['Type', 'Category', 'Value'];
  const settingsRows = [
    ['Print Settings', 'Agency Name', printForm.agencyName],
    ['Print Settings', 'Address', printForm.address],
    ['Print Settings', 'Phone', printForm.phone],
    ['Print Settings', 'Logo', printForm.logoData ? 'Yes' : 'No'],
    ['Currency', '1 JPY = MMK', rateInput],
    ['Currency', 'Display', displayInput],
    ...variables.map((v) => ['System Variable', categoryLabel(v.category), v.value]),
  ];

  return (
    <div className="space-y-6">
      <div className="bento-card space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <Settings className="h-5 w-5 text-blue-600" />
              <span>{t('settings.title')}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t('settings.subtitle')}</p>
          </div>
          <ExportButtons
            onExcel={() =>
              exportToExcel('Settings_Export', 'Settings', settingsHeaders, settingsRows, {
                title: t('settings.title'),
              })
            }
            onPdf={() =>
              exportToPDF(t('settings.title'), settingsHeaders, settingsRows, {
                subtitle: t('settings.subtitle'),
              })
            }
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
          <button
            type="button"
            onClick={() => setTab('print')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-bold transition ${
              tab === 'print'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            {t('settings.printTab')}
          </button>
          <button
            type="button"
            onClick={() => setTab('currency')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-bold transition ${
              tab === 'currency'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            {t('settings.currencyTab')}
          </button>
          <button
            type="button"
            onClick={() => setTab('variables')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-bold transition ${
              tab === 'variables'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTree className="h-3.5 w-3.5" />
            {t('settings.variablesTab')}
          </button>
          {canUsers && (
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-bold transition ${
                tab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UsersIcon className="h-3.5 w-3.5" />
              {t('settings.usersTab')}
            </button>
          )}
        </div>
      </div>

      {tab === 'print' && (
        <div className="bento-card space-y-5 p-5">
          <p className="text-xs text-slate-500">{t('settings.printHint')}</p>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                {t('settings.logo')}
              </label>
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                {printForm.logoData ? (
                  <img
                    src={printForm.logoData}
                    alt="Agency logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-300" />
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                {t('settings.uploadLogo')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
              {printForm.logoData && (
                <button
                  type="button"
                  onClick={() => setPrintForm((p) => ({ ...p, logoData: null }))}
                  className="cursor-pointer text-xs font-semibold text-red-600 hover:underline"
                >
                  {t('settings.removeLogo')}
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {t('settings.agencyName')}
                </label>
                <input
                  type="text"
                  value={printForm.agencyName}
                  onChange={(e) =>
                    setPrintForm((p) => ({ ...p, agencyName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {t('settings.address')}
                </label>
                <textarea
                  rows={3}
                  value={printForm.address}
                  onChange={(e) =>
                    setPrintForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  {t('settings.phone')}
                </label>
                <input
                  type="text"
                  value={printForm.phone}
                  onChange={(e) =>
                    setPrintForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {printMsg && (
            <p className="text-xs font-semibold text-blue-600">{printMsg}</p>
          )}

          <button
            type="button"
            onClick={savePrint}
            disabled={printSaving || !canSettingsUpdate}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {printSaving ? t('common.loading') : t('settings.savePrint')}
          </button>
        </div>
      )}

      {tab === 'currency' && (
        <div className="bento-card space-y-5 p-5">
          <p className="text-xs text-slate-500">{t('settings.currencyHint')}</p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {t('settings.exchangeRate')}
              </label>
              <input
                type="number"
                min={0.000001}
                step="any"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                disabled={!canSettingsUpdate}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none disabled:opacity-60"
              />
              <p className="mt-1 text-[11px] text-slate-400">{t('settings.exchangeRateHint')}</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                {t('settings.displayCurrency')}
              </label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="displayCurrency"
                    checked={displayInput === 'JPY'}
                    onChange={() => setDisplayInput('JPY')}
                    disabled={!canSettingsUpdate}
                  />
                  {t('settings.displayJpy')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="displayCurrency"
                    checked={displayInput === 'MMK'}
                    onChange={() => setDisplayInput('MMK')}
                    disabled={!canSettingsUpdate}
                  />
                  {t('settings.displayMmk')}
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-bold tracking-wide text-emerald-700 uppercase">
              {t('settings.currencyPreview')}
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-emerald-900">
              {t('settings.currencyPreviewExample', { jpy: previewJpy, mmk: previewMmk })}
            </p>
          </div>

          {currencyMsg && (
            <p className="text-xs font-semibold text-blue-600">{currencyMsg}</p>
          )}

          <button
            type="button"
            onClick={saveCurrency}
            disabled={currencySaving || !canSettingsUpdate}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {currencySaving ? t('common.loading') : t('settings.saveCurrency')}
          </button>
        </div>
      )}

      {tab === 'variables' && (
        <div className="bento-card space-y-4 p-5">
          <p className="text-xs text-slate-500">{t('settings.variablesHint')}</p>

          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCategory(c.id);
                  setNewValue('');
                  setVarMsg('');
                  setVarPage(1);
                }}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activeCategory === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t(c.labelKey)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={t('settings.addVariablePlaceholder')}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addVariable();
                }
              }}
            />
            <button
              type="button"
              onClick={addVariable}
              disabled={!canSettingsCreate}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {t('settings.addVariable')}
            </button>
          </div>

          {varMsg && <p className="text-xs font-semibold text-blue-600">{varMsg}</p>}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            {filteredVars.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">{t('common.noData')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pagedVars.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 break-words font-medium text-slate-800">
                      {v.value}
                    </span>
                    {canSettingsDelete && (
                      <div className="action-group">
                        <button
                          type="button"
                          onClick={() => removeVariable(v.id)}
                          className="action-btn action-btn-red"
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {filteredVars.length > 0 && (
              <TablePagination
                page={varPage}
                pageSize={varPageSize}
                total={varTotal}
                totalPages={varTotalPages}
                from={varFrom}
                to={varTo}
                onPageChange={setVarPage}
                onPageSizeChange={setVarPageSize}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'users' && canUsers && (
        <div className="bento-card p-5">
          <UserAccountsView currentUser={currentUser} />
        </div>
      )}
    </div>
  );
};
