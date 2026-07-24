import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  PlaneTakeoff,
  Receipt,
  FileBarChart,
  Settings,
  ChevronDown,
  Plane,
  Calendar,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { can, type UserPermissions } from '../utils/permissions';
import {
  REPORT_SECTIONS,
  reportSectionLabelKey,
  type ReportSection,
} from '../types/reports';

export type ActiveTab =
  | 'dashboard'
  | 'workers'
  | 'students'
  | 'deployments'
  | 'invoices'
  | 'reports'
  | 'settings'
  | 'notifications';

interface SidebarProps {
  activeTab: ActiveTab;
  reportSection: ReportSection;
  onTabChange: (tab: ActiveTab) => void;
  onReportSectionChange: (section: ReportSection) => void;
  pendingInvoicesCount: number;
  expiringContractsCount: number;
  permissions: UserPermissions;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  reportSection,
  onTabChange,
  onReportSectionChange,
  pendingInvoicesCount,
  expiringContractsCount,
  permissions,
}) => {
  const { t } = useLanguage();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });
  const [reportsOpen, setReportsOpen] = useState(false);

  const canReports = can(permissions, 'reports', 'read');

  const reportIcons: Record<ReportSection, typeof Plane> = {
    fees: Plane,
    students: GraduationCap,
    upcoming: Calendar,
    outstanding: Receipt,
    expiry: Users,
  };

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      badge: undefined as number | string | undefined,
      badgeColor: undefined as string | undefined,
      visible: can(permissions, 'dashboard', 'read'),
    },
    {
      id: 'workers' as ActiveTab,
      label: t('nav.workers'),
      icon: Users,
      badge: undefined,
      badgeColor: undefined,
      visible: can(permissions, 'workers', 'read'),
    },
    {
      id: 'students' as ActiveTab,
      label: t('nav.students'),
      icon: GraduationCap,
      badge: undefined,
      badgeColor: undefined,
      visible: can(permissions, 'students', 'read'),
    },
    {
      id: 'deployments' as ActiveTab,
      label: t('nav.deployments'),
      icon: PlaneTakeoff,
      badge: expiringContractsCount > 0 ? expiringContractsCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      visible: can(permissions, 'deployments', 'read'),
    },
    {
      id: 'invoices' as ActiveTab,
      label: t('nav.invoices'),
      icon: Receipt,
      badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined,
      badgeColor: 'bg-red-500/20 text-red-300 border border-red-500/30',
      visible: can(permissions, 'invoices', 'read'),
    },
    {
      id: 'settings' as ActiveTab,
      label: t('nav.settings'),
      icon: Settings,
      badge: undefined,
      badgeColor: undefined,
      visible:
        can(permissions, 'settings', 'read') || can(permissions, 'users', 'read'),
    },
  ].filter((item) => item.visible);

  const activeIndicatorKey =
    activeTab === 'reports' && reportsOpen ? `report-${reportSection}` : activeTab;

  const updateIndicator = () => {
    const navEl = navRef.current;
    const btn = itemRefs.current[activeIndicatorKey];
    if (!navEl || !btn) {
      setIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }
    const navRect = navEl.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      top: btnRect.top - navRect.top + navEl.scrollTop,
      height: btnRect.height,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeTab, reportSection, reportsOpen, t]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    const navEl = navRef.current;
    navEl?.addEventListener('scroll', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      navEl?.removeEventListener('scroll', onResize);
    };
  }, [activeTab, reportSection, reportsOpen]);

  const renderNavButton = (
    id: string,
    label: string,
    Icon: typeof LayoutDashboard,
    opts: {
      isActive: boolean;
      onClick: () => void;
      badge?: number | string;
      badgeColor?: string;
      indent?: boolean;
      trailing?: React.ReactNode;
    }
  ) => (
    <button
      key={id}
      id={`sidebar-nav-${id}`}
      ref={(el) => {
        itemRefs.current[id] = el;
      }}
      type="button"
      onClick={opts.onClick}
      className={`relative z-10 flex w-full cursor-pointer items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-medium sm:text-sm ${
        opts.indent ? 'pl-8' : ''
      } ${
        opts.isActive
          ? 'font-semibold text-blue-400'
          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
      }`}
      style={{
        transition:
          'color 280ms cubic-bezier(0.22, 1, 0.36, 1), background-color 280ms ease',
      }}
    >
      <div className="flex min-w-0 items-center space-x-3">
        <Icon
          className={`h-4 w-4 shrink-0 ${opts.isActive ? 'text-blue-400' : 'text-slate-400'}`}
          style={{
            transition: 'color 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms ease',
            transform: opts.isActive ? 'scale(1.08)' : 'scale(1)',
          }}
        />
        <span className="truncate text-left text-xs font-semibold">{label}</span>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1.5">
        {opts.badge !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              opts.badgeColor || 'border border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {opts.badge}
          </span>
        )}
        {opts.trailing}
      </div>
    </button>
  );

  // Insert Reports before Settings in visual order
  const beforeSettings = navItems.filter((i) => i.id !== 'settings');
  const settingsItem = navItems.find((i) => i.id === 'settings');

  return (
    <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-slate-800 bg-slate-900 p-3.5 md:flex">
      <nav className="flex min-h-0 flex-col">
        <div className="px-3 py-2 text-micro font-bold text-slate-500">{t('nav.menu')}</div>
        <div ref={navRef} className="relative space-y-1.5">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 rounded-xl border border-blue-500/30 bg-blue-600/15 shadow-xs"
            style={{
              top: indicator.top,
              height: indicator.height,
              opacity: indicator.ready ? 1 : 0,
              transition:
                'top 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
            }}
          />

          {beforeSettings.map((item) => {
            const Icon = item.icon;
            return renderNavButton(item.id, item.label, Icon, {
              isActive: activeTab === item.id,
              onClick: () => onTabChange(item.id),
              badge: item.badge,
              badgeColor: item.badgeColor,
            });
          })}

          {canReports && (
            <div className="space-y-1">
              {renderNavButton('reports', t('nav.reports'), FileBarChart, {
                isActive: activeTab === 'reports',
                onClick: () => {
                  if (activeTab === 'reports') {
                    setReportsOpen((o) => !o);
                    return;
                  }
                  setReportsOpen(true);
                  onTabChange('reports');
                  onReportSectionChange(reportSection || 'fees');
                },
                trailing: (
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                      reportsOpen ? 'rotate-180' : ''
                    }`}
                  />
                ),
              })}
              {reportsOpen &&
                REPORT_SECTIONS.map((section) => {
                  const Icon = reportIcons[section] || Briefcase;
                  const isActive = activeTab === 'reports' && reportSection === section;
                  return renderNavButton(
                    `report-${section}`,
                    t(reportSectionLabelKey(section)),
                    Icon,
                    {
                      isActive,
                      indent: true,
                      onClick: () => {
                        setReportsOpen(true);
                        onTabChange('reports');
                        onReportSectionChange(section);
                      },
                    }
                  );
                })}
            </div>
          )}

          {settingsItem &&
            renderNavButton(settingsItem.id, settingsItem.label, settingsItem.icon, {
              isActive: activeTab === settingsItem.id,
              onClick: () => onTabChange(settingsItem.id),
              badge: settingsItem.badge,
              badgeColor: settingsItem.badgeColor,
            })}
        </div>
      </nav>
    </aside>
  );
};
