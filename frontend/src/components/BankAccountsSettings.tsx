import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Save, Trash2 } from 'lucide-react';
import type { BankAccount } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { confirmDelete, showError, showSuccess } from '../utils/swal';

const emptyForm = {
  label: '',
  bankName: '',
  branchCode: '',
  branchName: '',
  accountNumber: '',
  accountHolder: '',
  isDefault: false,
};

interface BankAccountsSettingsProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export const BankAccountsSettings: React.FC<BankAccountsSettingsProps> = ({
  canCreate,
  canUpdate,
  canDelete,
}) => {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/settings/bank-accounts');
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setMsg(t('settings.loadFail'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (a: BankAccount) => {
    setEditingId(a.id);
    setForm({
      label: a.label || '',
      bankName: a.bankName || '',
      branchCode: a.branchCode || '',
      branchName: a.branchName || '',
      accountNumber: a.accountNumber || '',
      accountHolder: a.accountHolder || '',
      isDefault: a.isDefault,
    });
  };

  const save = async () => {
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountHolder.trim()) {
      setMsg(t('settings.bankRequired'));
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(
        editingId ? `/api/settings/bank-accounts/${editingId}` : '/api/settings/bank-accounts',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      await load();
      resetForm();
      setMsg(t('settings.bankSaved'));
      await showSuccess(t('settings.bankSaved'));
    } catch (err) {
      setMsg(t('settings.bankSaveFail'));
      await showError(
        t('settings.bankSaveFail'),
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirmDelete({ text: t('settings.bankDeleteConfirm') });
    if (!ok) return;
    try {
      const res = await fetch(`/api/settings/bank-accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      await showError(
        t('settings.bankDeleteFail'),
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900">{t('settings.bankAccounts')}</h3>
      </div>
      <p className="text-xs text-slate-500">{t('settings.bankAccountsHint')}</p>

      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0 text-xs">
                <p className="font-bold text-slate-900">
                  {a.label || a.bankName}
                  {a.isDefault ? (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {t('settings.bankDefault')}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-slate-600">
                  {a.bankName}
                  {a.branchName ? ` / ${a.branchName}` : ''}
                  {a.branchCode ? ` (${a.branchCode})` : ''}
                </p>
                <p className="font-mono text-slate-700">
                  {a.accountNumber} · {a.accountHolder}
                </p>
              </div>
              <div className="flex gap-1.5">
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t('common.edit')}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void remove(a.id)}
                    className="cursor-pointer rounded-lg border border-red-100 px-2 py-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(canCreate || (canUpdate && editingId)) && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-700">
            {editingId ? t('settings.bankEdit') : t('settings.bankAdd')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('settings.bankLabel')}
              </label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
                placeholder={t('settings.bankLabelHint')}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('settings.bankName')} *
              </label>
              <input
                required
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('settings.branchCode')}
              </label>
              <input
                value={form.branchCode}
                onChange={(e) => setForm((f) => ({ ...f, branchCode: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('settings.branchName')}
              </label>
              <input
                value={form.branchName}
                onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('settings.accountNumber')} *
              </label>
              <input
                required
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                {t('settings.accountHolder')} *
              </label>
              <input
                required
                value={form.accountHolder}
                onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="rounded border-slate-300"
            />
            {t('settings.bankSetDefault')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {editingId ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {saving ? t('common.loading') : editingId ? t('common.save') : t('settings.bankAdd')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {msg && <p className="text-xs font-semibold text-blue-600">{msg}</p>}
    </div>
  );
};
