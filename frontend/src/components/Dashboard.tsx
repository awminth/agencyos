import React from 'react';
import { Worker, Invoice, DashboardStats } from '../types';
import {
  Users,
  AlertTriangle,
  Receipt,
  TrendingDown,
  Clock,
  ShieldAlert,
  Building,
} from 'lucide-react';
import { ExportButtons } from './ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';

interface DashboardProps {
  stats: DashboardStats | null;
  workers: Worker[];
  invoices: Invoice[];
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, workers, invoices }) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();

  const money = (amount: number, currency?: string) =>
    formatMoney(amount, (currency as MoneyCurrency) || 'JPY');

  if (!stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8 text-center text-slate-400">
        <div className="mr-3 h-8 w-8 animate-spin rounded-full border-b-2 border-amber-500" />
        {t('common.loading')}
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const target7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const urgentInvoices = invoices.filter(
    (i) =>
      (i.feeType || 'management') === 'management' &&
      i.nextInvoiceDate >= todayStr &&
      i.nextInvoiceDate <= target7Days &&
      i.status !== 'Paid'
  );

  const target60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const expiringWorkers = workers.filter((w) => {
    const exp = w.deployment?.contractEndDate;
    return w.status === 'Active' && exp && exp >= todayStr && exp <= target60Days;
  });

  const statusPieData = [
    { name: t('status.active'), value: stats.activeWorkers, color: '#10b981' },
    { name: t('status.ended'), value: stats.contractEndedWorkers, color: '#3b82f6' },
    { name: t('status.absconded'), value: stats.abscondedWorkers, color: '#ef4444' },
  ];

  const visaCounts: Record<string, number> = {};
  workers.forEach((w) => {
    const v = w.deployment?.visaType || 'Unknown';
    visaCounts[v] = (visaCounts[v] || 0) + 1;
  });
  const visaBarData = Object.keys(visaCounts).map((v) => ({
    visa: v,
    count: visaCounts[v],
  }));

  const summaryHeaders = ['Metric', 'Value'];
  const summaryRows = [
    ['Total Workers', stats.totalWorkers],
    ['Active Workers', stats.activeWorkers],
    ['Contract Ended', stats.contractEndedWorkers],
    ['Absconded', stats.abscondedWorkers],
    ['Absconding Rate %', stats.abscondingRate],
    ['Total Invoices', stats.totalInvoicesCount],
    ['Pending Invoices', stats.pendingInvoicesCount],
    ['Upcoming Invoices (7 days)', stats.upcomingInvoicesCount7Days],
    ['Contracts Expiring (30 days)', stats.contractExpiring30DaysCount],
    ['Urgent Invoices (7 days)', urgentInvoices.length],
    ['Outstanding (display)', formatMoney(stats.totalOutstandingAmountJPY, 'JPY')],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              <span>{t('dashboard.title')}</span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                {t('dashboard.live')}
              </span>
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">{t('dashboard.subtitle')}</p>
          </div>
          <ExportButtons
            onExcel={() =>
              exportToExcel('Dashboard_Summary', 'Dashboard', summaryHeaders, summaryRows, {
                title: t('dashboard.title'),
              })
            }
            onPdf={() =>
              exportToPDF(t('dashboard.title'), summaryHeaders, summaryRows, {
                subtitle: t('dashboard.subtitle'),
              })
            }
          />
        </div>
      </div>

      {urgentInvoices.length > 0 && (
        <div className="bento-card space-y-3 border-orange-200 bg-orange-50/90 p-5 text-orange-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/10 p-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-orange-900">
                <span>⚠️ {t('dashboard.urgentTitle')}</span>
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {urgentInvoices.length}
                </span>
              </h3>
              <p className="text-xs text-orange-800/80">{t('dashboard.urgentDesc')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-orange-200/80 pt-2 md:grid-cols-2 lg:grid-cols-3">
            {urgentInvoices.slice(0, 6).map((inv) => (
              <div
                key={inv.id}
                className="rounded-xl border border-orange-200 bg-white p-3 text-xs shadow-xs"
              >
                <div className="flex justify-between font-bold text-slate-900">
                  <span>
                    {inv.workerName} ({inv.passportNo})
                  </span>
                  <span className="font-mono text-orange-600">{inv.nextInvoiceDate}</span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{inv.hostCompany}</div>
                <div className="mt-1 font-mono font-semibold text-slate-900">
                  {money(inv.outstandingAmount, inv.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expiringWorkers.length > 0 && (
        <div className="bento-card border-amber-200 bg-amber-50/80 p-5 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900">
                ⏳ {t('dashboard.expiryTitle')} ({expiringWorkers.length})
              </h3>
              <p className="text-xs text-amber-800/80">{t('dashboard.expiryDesc')}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {expiringWorkers.slice(0, 4).map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs"
              >
                <span className="font-bold text-slate-900">{w.name}</span>
                <span className="ml-2 font-mono text-amber-700">
                  {w.deployment.contractEndDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bento-card p-5">
          <p className="text-micro">{t('dashboard.totalWorkers')}</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {stats.totalWorkers}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="status-badge bg-green-100 text-green-700">
                  {stats.activeWorkers} {t('dashboard.active')}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {stats.contractEndedWorkers} {t('dashboard.ended')}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bento-card p-5">
          <p className="text-micro">{t('dashboard.abscondRate')}</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-red-600">
                {stats.abscondingRate}%
              </h2>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {stats.abscondedWorkers} {t('dashboard.workersTotal')}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-2 text-red-600">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bento-card p-5">
          <p className="text-micro">{t('dashboard.outstanding')}</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <h2 className="font-mono text-3xl font-bold tracking-tight text-slate-900">
                {formatMoney(stats.totalOutstandingAmountJPY, 'JPY', true)}
              </h2>
              <p className="mt-1 text-[11px] font-bold text-orange-600">
                {stats.pendingInvoicesCount} {t('dashboard.invoicesDue')}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bento-card p-5">
          <p className="text-micro">{t('dashboard.unsentReceipts')}</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {stats.unsentReceiptsCount}
              </h2>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{t('dashboard.pending')}</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bento-card space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Users className="h-4 w-4 text-blue-600" />
              <span>{t('dashboard.statusRatio')}</span>
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-card space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Building className="h-4 w-4 text-blue-600" />
              <span>{t('dashboard.byVisa')}</span>
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visaBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="visa" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name={t('dashboard.workersCount')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bento-card space-y-4 p-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Receipt className="h-4 w-4 text-emerald-600" />
              <span>{t('dashboard.recentInvoices')}</span>
            </h3>
          </div>
          <div className="space-y-2.5">
            {invoices.slice(0, 4).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {inv.invoiceNo}{' '}
                    <span className="font-normal text-slate-500">({inv.workerName})</span>
                  </div>
                  <div className="mt-0.5 max-w-[200px] truncate text-[11px] text-slate-500">
                    {inv.hostCompany}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">
                    {money(inv.outstandingAmount, inv.currency)}
                  </div>
                  <span
                    className={`status-badge mt-1 inline-block ${
                      inv.status === 'Paid'
                        ? 'bg-green-100 text-green-700'
                        : inv.status === 'Partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-card space-y-4 p-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Users className="h-4 w-4 text-blue-600" />
              <span>{t('dashboard.recentWorkers')}</span>
            </h3>
          </div>
          <div className="space-y-2.5">
            {workers.slice(0, 4).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {w.name}{' '}
                    <span className="font-mono text-slate-500">({w.serialNo})</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    Visa: {w.deployment.visaType} | PP: {w.passportNo}
                  </div>
                </div>
                <span
                  className={`status-badge inline-block ${
                    w.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : w.status === 'Contract Ended'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
