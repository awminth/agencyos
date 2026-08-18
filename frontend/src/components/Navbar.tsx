import React from 'react';
import { AuthUser } from '../types';
import { Bell, LogOut, Banknote } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { LanguageDropdown } from './LanguageDropdown';
import { BRAND_LOGO_SRC } from '../utils/brand';

interface NavbarProps {
  alertCount: number;
  onOpenAlerts: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  alertCount,
  onOpenAlerts,
  currentUser,
  onLogout,
}) => {
  const { t } = useLanguage();
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  const toggleCurrency = () => {
    void setDisplayCurrency(displayCurrency === 'JPY' ? 'MMK' : 'JPY');
  };

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-800 bg-slate-900 text-white shadow-sm">
      <div className="flex h-16 w-full items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center space-x-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <img
                src={BRAND_LOGO_SRC}
                alt="Marctober Tech"
                className="h-full w-full object-contain p-0.5"
              />
            </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
              <span>AgencyOS</span>
              <span className="hidden rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400 sm:inline-block">
                Myanmar - Japan ERP
              </span>
            </h1>
            <p className="hidden truncate text-[11px] text-slate-400 sm:block">{t('nav.tagline')}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            id="nav-alert-bell"
            type="button"
            onClick={onOpenAlerts}
            className="relative cursor-pointer rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            title={t('nav.notifications')}
          >
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleCurrency}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-500"
            title={t('nav.currency')}
          >
            <Banknote className="h-3.5 w-3.5 shrink-0 opacity-90" />
            <span className="font-mono tracking-wide">
              {displayCurrency === 'JPY' ? '¥ JPY' : 'Ks MMK'}
            </span>
          </button>

          <LanguageDropdown variant="dark" />

          {currentUser && (
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
              <div className="hidden flex-col text-right lg:flex">
                <span className="max-w-[110px] truncate text-xs font-bold text-slate-200">
                  {currentUser.name}
                </span>
                <span className="font-mono text-[10px] text-blue-400">{currentUser.role}</span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex cursor-pointer items-center gap-1 rounded-lg p-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
                  title={t('nav.logout')}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
