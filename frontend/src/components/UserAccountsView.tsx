import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Save,
  X,
  Search,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AuthUser, UserRole } from '../types';
import { confirmDelete, showError, showSuccess } from '../utils/swal';
import {
  CRUD_ACTIONS,
  CrudAction,
  ModulePermission,
  PERMISSION_MODULES,
  PermissionModule,
  UserPermissions,
  authHeaders,
  can,
  defaultPermissionsForRole,
  normalizePermissions,
} from '../utils/permissions';
import { ExportButtons } from './ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { TablePagination, usePagination } from './TablePagination';
import { MobileFilterToggle } from './MobileFilterToggle';
import { MobileMeta } from './MobileMeta';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  isActive: boolean;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

interface UserAccountsViewProps {
  currentUser: AuthUser;
}

const emptyForm = (role: UserRole = 'Staff') => ({
  name: '',
  email: '',
  password: '',
  role,
  title: '',
  isActive: true,
  permissions: defaultPermissionsForRole(role),
});

export const UserAccountsView: React.FC<UserAccountsViewProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const canRead = can(currentUser.permissions, 'users', 'read');
  const canCreate = can(currentUser.permissions, 'users', 'create');
  const canUpdate = can(currentUser.permissions, 'users', 'update');
  const canDelete = can(currentUser.permissions, 'users', 'delete');

  const moduleLabel = (m: PermissionModule) => t(`perm.module.${m}`);
  const actionLabel = (a: CrudAction) => t(`perm.action.${a}`);

  const loadUsers = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/users', {
        headers: authHeaders(currentUser.id),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMsg(err.message || t('users.loadFail'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) loadUsers();
    else setLoading(false);
  }, [currentUser.id]);

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm('Staff'));
    setMsg('');
  };

  const openEdit = (u: ManagedUser) => {
    setCreating(false);
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      title: u.title,
      isActive: u.isActive,
      permissions: normalizePermissions(u.permissions, u.role),
    });
    setMsg('');
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const setRole = (role: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: defaultPermissionsForRole(role),
      title: prev.title || `${role} User`,
    }));
  };

  const togglePerm = (mod: PermissionModule, action: CrudAction) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [mod]: {
          ...prev.permissions[mod],
          [action]: !prev.permissions[mod][action],
        },
      },
    }));
  };

  const setModuleAll = (mod: PermissionModule, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [mod]: {
          create: value,
          read: value,
          update: value,
          delete: value,
        } as ModulePermission,
      },
    }));
  };

  const save = async () => {
    setMsg('');
    try {
      if (!form.name.trim() || !form.email.trim()) {
        setMsg(t('users.required'));
        return;
      }
      if (creating && !form.password.trim()) {
        setMsg(t('users.passwordRequired'));
        return;
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        title: form.title.trim() || `${form.role} User`,
        isActive: form.isActive,
        permissions: form.permissions,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      const res = await fetch(creating ? '/api/users' : `/api/users/${editing!.id}`, {
        method: creating ? 'POST' : 'PUT',
        headers: authHeaders(currentUser.id),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('users.saveFail'));

      closeModal();
      setMsg(t('users.saved'));
      await loadUsers();
    } catch (err: any) {
      setMsg(err.message || t('users.saveFail'));
    }
  };

  const remove = async (u: ManagedUser) => {
    const ok = await confirmDelete({
      title: t('users.deleteConfirm'),
      text: u.email,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
        headers: authHeaders(currentUser.id),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('users.deleteFail'));
      }
      await showSuccess(t('users.deleted'));
      await loadUsers();
    } catch (err: any) {
      await showError(t('users.deleteFail'), err.message);
    }
  };

  const exportHeaders = ['Name', 'Email', 'Role', 'Title', 'Active', 'Permissions'];
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.title || '').toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems,
    from,
    to,
    total,
  } = usePagination(filteredUsers, 10);

  const activeFilterCount = searchTerm.trim() ? 1 : 0;

  const exportRows = useMemo(
    () =>
      filteredUsers.map((u) => [
        u.name,
        u.email,
        u.role,
        u.title,
        u.isActive ? 'Yes' : 'No',
        PERMISSION_MODULES.map((m) => {
          const p = u.permissions[m];
          const flags = CRUD_ACTIONS.filter((a) => p?.[a]).join('');
          return `${m}:${flags || '-'}`;
        }).join(' | '),
      ]),
    [filteredUsers]
  );

  const renderActions = (u: ManagedUser) => (
    <div className="action-group">
      {canUpdate && (
        <button
          type="button"
          className="action-btn action-btn-blue"
          onClick={() => openEdit(u)}
          title="Edit"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          className="action-btn action-btn-red"
          onClick={() => remove(u)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (!canRead) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {t('users.noAccess')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Users className="h-4 w-4 text-blue-600" />
            {t('users.title')}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{t('users.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            onExcel={() =>
              exportToExcel('User_Accounts', 'Users', exportHeaders, exportRows, {
                title: t('users.title'),
              })
            }
            onPdf={() =>
              exportToPDF(t('users.title'), exportHeaders, exportRows, {
                subtitle: t('users.subtitle'),
              })
            }
          />
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('users.add')}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {msg}
        </div>
      )}

      <MobileFilterToggle
        open={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        activeCount={activeFilterCount}
      />

      <div className={`${filtersOpen ? 'block' : 'hidden'} md:block`}>
        <div className="relative">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('users.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="divide-y divide-slate-100 md:hidden">
            {pagedItems.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">{t('users.empty')}</p>
            ) : (
              pagedItems.map((u) => (
                <div key={u.id} className="mobile-list-row">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{u.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">{u.email}</p>
                    </div>
                    <span
                      className={`status-badge shrink-0 ${
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.isActive ? t('users.active') : t('users.inactive')}
                    </span>
                  </div>

                  <MobileMeta
                    items={[
                      { label: t('users.colRole'), value: u.role },
                      { label: t('users.titleField'), value: u.title || '—' },
                      {
                        label: 'Created',
                        value: u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString()
                          : '—',
                      },
                      {
                        label: 'Updated',
                        value: u.updatedAt
                          ? new Date(u.updatedAt).toLocaleDateString()
                          : '—',
                      },
                    ]}
                  />

                  <div className="mobile-list-actions">{renderActions(u)}</div>
                </div>
              ))
            )}
          </div>

          <div className="data-table-wrap hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('users.colName')}</th>
                  <th>{t('users.colEmail')}</th>
                  <th>{t('users.colRole')}</th>
                  <th className="text-center">{t('common.status')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      {t('users.empty')}
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-primary">{u.name}</span>
                          <span className="cell-secondary">{u.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cell-mono text-xs">{u.email}</span>
                      </td>
                      <td>
                        <span className="pill pill-blue">{u.role}</span>
                      </td>
                      <td className="text-center">
                        <span
                          className={`status-badge inline-block ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.isActive ? t('users.active') : t('users.inactive')}
                        </span>
                      </td>
                      <td className="text-right">{renderActions(u)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            from={from}
            to={to}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Shield className="h-4 w-4 text-blue-600" />
                {creating ? t('users.add') : t('users.edit')}
              </h4>
              <button type="button" onClick={closeModal} className="cursor-pointer rounded-lg p-1.5 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{t('users.colName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{t('users.colEmail')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  {t('users.password')} {editing ? t('users.passwordHint') : '*'}
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  placeholder={editing ? '••••••••' : ''}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{t('users.colRole')}</label>
                <select
                  value={form.role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{t('users.titleField')}</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t('users.active')}
                </label>
              </div>
            </div>

            <div className="mt-5">
              <h5 className="mb-2 text-sm font-bold text-slate-900">{t('users.permissions')}</h5>
              <p className="mb-3 text-[11px] text-slate-500">{t('users.permissionsHint')}</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="px-3 py-2 font-bold">{t('users.module')}</th>
                      {CRUD_ACTIONS.map((a) => (
                        <th key={a} className="px-2 py-2 text-center font-bold uppercase">
                          {actionLabel(a)}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center font-bold">{t('users.all')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MODULES.map((mod) => (
                      <tr key={mod} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-800">{moduleLabel(mod)}</td>
                        {CRUD_ACTIONS.map((action) => (
                          <td key={action} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(form.permissions[mod]?.[action])}
                              onChange={() => togglePerm(mod, action)}
                              className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setModuleAll(
                                mod,
                                !CRUD_ACTIONS.every((a) => form.permissions[mod]?.[a])
                              )
                            }
                            className="cursor-pointer text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            {t('users.toggle')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {msg && <p className="mt-3 text-xs text-red-600">{msg}</p>}

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
              >
                <Save className="h-3.5 w-3.5" />
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
