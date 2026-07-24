import React, { useMemo, useState } from 'react';
import {
  Bell,
  Receipt,
  PlaneTakeoff,
  ArrowRight,
  CheckCheck,
  BellRing,
  BellOff,
} from 'lucide-react';
import { Invoice, Worker } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { TablePagination, usePagination } from './TablePagination';
import type { ActiveTab } from './Sidebar';
import {
  getNotificationPermission,
  requestNotificationPermission,
  registerAppServiceWorker,
  type NotificationPermissionState,
} from '../utils/browserNotifications';
import { sendTestWebPush, subscribeWebPush } from '../utils/webPush';

type NotifFilter = 'all' | 'invoices' | 'contracts';

interface NotificationsViewProps {
  urgentInvoices: Invoice[];
  expiringWorkers: Worker[];
  unreadCount: number;
  userId: string;
  onNavigate: (tab: ActiveTab) => void;
  onMarkAllRead: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  urgentInvoices,
  expiringWorkers,
  unreadCount,
  userId,
  onNavigate,
  onMarkAllRead,
}) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [perm, setPerm] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [permBusy, setPermBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'ok' | 'vapid_missing' | 'error'>(
    'idle'
  );
  const [testBusy, setTestBusy] = useState(false);

  const totalCount = urgentInvoices.length + expiringWorkers.length;

  type Row =
    | { kind: 'invoice'; id: string; invoice: Invoice }
    | { kind: 'contract'; id: string; worker: Worker };

  const rows = useMemo(() => {
    const invoiceRows: Row[] = urgentInvoices.map((invoice) => ({
      kind: 'invoice' as const,
      id: `inv-${invoice.id}`,
      invoice,
    }));
    const contractRows: Row[] = expiringWorkers.map((worker) => ({
      kind: 'contract' as const,
      id: `w-${worker.id}`,
      worker,
    }));

    if (filter === 'invoices') return invoiceRows;
    if (filter === 'contracts') return contractRows;
    return [...invoiceRows, ...contractRows];
  }, [urgentInvoices, expiringWorkers, filter]);

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
  } = usePagination(rows, 10);

  const handleEnableBrowserNotifs = async () => {
    setPermBusy(true);
    setPushStatus('idle');
    try {
      const next = await requestNotificationPermission();
      setPerm(next);
      if (next !== 'granted') return;

      const reg = await registerAppServiceWorker();
      if (!reg) {
        setPushStatus('error');
        return;
      }
      const result = await subscribeWebPush(userId, reg);
      if (result.ok) setPushStatus('ok');
      else if (result.reason === 'vapid_missing') setPushStatus('vapid_missing');
      else setPushStatus('error');
    } finally {
      setPermBusy(false);
    }
  };

  const handleTestPush = async () => {
    setTestBusy(true);
    try {
      const ok = await sendTestWebPush(userId);
      setPushStatus(ok ? 'ok' : 'error');
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {t('alert.title')}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{t('alert.subtitle')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {unreadCount > 0
              ? `${unreadCount} ${t('alert.unreadBadge')}`
              : `${totalCount} ${t('alert.totalBadge')}`}
          </div>

          {perm !== 'granted' && perm !== 'unsupported' && (
            <button
              type="button"
              disabled={permBusy || perm === 'denied'}
              onClick={() => void handleEnableBrowserNotifs()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              title={
                perm === 'denied' ? t('alert.browserDenied') : t('alert.enableBrowser')
              }
            >
              {perm === 'denied' ? (
                <BellOff className="h-3.5 w-3.5" />
              ) : (
                <BellRing className="h-3.5 w-3.5" />
              )}
              {perm === 'denied' ? t('alert.browserDenied') : t('alert.enableBrowser')}
            </button>
          )}

          {perm === 'granted' && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <BellRing className="h-3.5 w-3.5" />
              {t('alert.browserOn')}
            </span>
          )}

          {perm === 'granted' && (
            <button
              type="button"
              disabled={testBusy}
              onClick={() => void handleTestPush()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {t('alert.testPush')}
            </button>
          )}

          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={onMarkAllRead}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t('alert.markAllRead')}
          </button>
        </div>
      </div>

      {perm === 'unsupported' && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t('alert.browserUnsupported')}
        </p>
      )}

      {pushStatus === 'vapid_missing' && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t('alert.vapidMissing')}
        </p>
      )}

      {pushStatus === 'ok' && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {t('alert.pushReady')}
        </p>
      )}

      {pushStatus === 'error' && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {t('alert.pushError')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'all' as const, label: t('alert.filterAll'), count: totalCount },
            {
              id: 'invoices' as const,
              label: t('alert.urgentInvoices'),
              count: urgentInvoices.length,
            },
            {
              id: 'contracts' as const,
              label: t('alert.expiring'),
              count: expiringWorkers.length,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              filter === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">{t('alert.colType')}</th>
                <th className="px-4 py-3">{t('alert.colSubject')}</th>
                <th className="px-4 py-3">{t('alert.colDetail')}</th>
                <th className="px-4 py-3">{t('alert.colDate')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                    {t('alert.none')}
                  </td>
                </tr>
              ) : (
                pagedItems.map((row) => {
                  if (row.kind === 'invoice') {
                    const i = row.invoice;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 font-semibold text-red-700">
                            <Receipt className="h-3.5 w-3.5" />
                            Invoice
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{i.workerName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{i.invoiceNo}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{i.hostCompany}</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-700">
                          {i.nextInvoiceDate}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate('invoices')}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            {t('alert.goInvoices')}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const w = row.worker;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-800">
                          <PlaneTakeoff className="h-3.5 w-3.5" />
                          Contract
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{w.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{w.passportNo}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {w.deployment.hostCompany}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-700">
                        {w.deployment.contractEndDate}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate('deployments')}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          {t('alert.goDeployments')}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
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
        )}
      </div>
    </div>
  );
};
