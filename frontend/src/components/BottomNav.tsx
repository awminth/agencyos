import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  PlaneTakeoff,
  Receipt,
  FileBarChart,
  Settings,
  Plane,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { useLanguage } from '../context/LanguageContext';
import { can, type UserPermissions } from '../utils/permissions';
import {
  REPORT_SECTIONS,
  reportSectionLabelKey,
  type ReportSection,
} from '../types/reports';

interface BottomNavProps {
  activeTab: ActiveTab;
  reportSection: ReportSection;
  onTabChange: (tab: ActiveTab) => void;
  onReportSectionChange: (section: ReportSection) => void;
  pendingInvoicesCount: number;
  expiringContractsCount: number;
  permissions: UserPermissions;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  reportSection,
  onTabChange,
  onReportSectionChange,
  pendingInvoicesCount,
  expiringContractsCount,
  permissions,
}) => {
  const { t } = useLanguage();
  const rowRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const allItems: {
    id: ActiveTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
    badgeClass?: string;
  }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'workers', label: t('nav.workers'), icon: Users },
    { id: 'students', label: t('nav.students'), icon: GraduationCap },
    {
      id: 'deployments',
      label: t('nav.deployments'),
      icon: PlaneTakeoff,
      badge: expiringContractsCount > 0 ? expiringContractsCount : undefined,
      badgeClass: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'invoices',
      label: t('nav.invoices'),
      icon: Receipt,
      badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined,
      badgeClass: 'bg-red-500 text-white',
    },
    { id: 'reports', label: t('nav.reports'), icon: FileBarChart },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const items = allItems.filter((item) => {
    if (item.id === 'settings') {
      return can(permissions, 'settings', 'read') || can(permissions, 'users', 'read');
    }
    if (item.id === 'notifications') return false;
    return can(permissions, item.id, 'read');
  });

  const reportIcons: Record<ReportSection, typeof Plane> = {
    fees: Plane,
    students: GraduationCap,
    upcoming: Calendar,
    outstanding: Receipt,
    expiry: Users,
  };

  const updateIndicator = () => {
    const row = rowRef.current;
    const btn = itemRefs.current[activeTab];
    if (!row || !btn) {
      setIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }
    const rowRect = row.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - rowRect.left,
      width: btnRect.width,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeTab, t]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeTab]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {activeTab === 'reports' && can(permissions, 'reports', 'read') && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-800 px-2 py-2">
          {REPORT_SECTIONS.map((section) => {
            const Icon = reportIcons[section];
            const active = reportSection === section;
            return (
              <button
                key={section}
                type="button"
                onClick={() => onReportSectionChange(section)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span className="max-w-[9rem] truncate">{t(reportSectionLabelKey(section))}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={rowRef}
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 rounded-xl bg-blue-600/15"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.ready ? 1 : 0,
            transition:
              'left 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 h-0.5 rounded-full bg-blue-400"
          style={{
            left: indicator.left + indicator.width * 0.2,
            width: indicator.width * 0.6,
            opacity: indicator.ready ? 1 : 0,
            transition:
              'left 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
          }}
        />

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              id={`bottom-nav-${item.id}`}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              onClick={() => {
                if (item.id === 'reports') {
                  onReportSectionChange(reportSection || 'fees');
                }
                onTabChange(item.id);
              }}
              className={`relative z-10 flex cursor-pointer flex-col items-center gap-0.5 px-0.5 py-2.5 text-[9px] font-semibold sm:text-[10px] ${
                isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{
                transition: 'color 280ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <span className="relative">
                <Icon
                  className="h-5 w-5"
                  style={{
                    transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), color 280ms ease',
                    transform: isActive ? 'translateY(-1px) scale(1.08)' : 'none',
                  }}
                />
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      item.badgeClass || 'bg-slate-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="truncate px-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
