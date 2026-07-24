import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage, type Lang } from '../context/LanguageContext';

const LANG_OPTIONS: {
  value: Lang;
  label: string;
  native: string;
  flag: string;
}[] = [
  { value: 'EN', label: 'English', native: 'English', flag: '🇬🇧' },
  { value: 'MM', label: 'Myanmar', native: 'မြန်မာ', flag: '🇲🇲' },
  { value: 'JP', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
];

interface LanguageDropdownProps {
  /** Dark navbar style vs light login style */
  variant?: 'dark' | 'light';
  className?: string;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  variant = 'dark',
  className = '',
}) => {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LANG_OPTIONS.find((o) => o.value === lang) || LANG_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isDark = variant === 'dark';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.language')}
        title={t('nav.language')}
        className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition-all ${
          isDark
            ? 'border border-blue-500/30 bg-gradient-to-b from-slate-800 to-slate-950 text-slate-100 shadow-sm hover:border-blue-400/50'
            : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
        }`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg text-sm ${
            isDark ? 'bg-blue-500/15' : 'bg-blue-50 dark:bg-blue-500/15'
          }`}
          aria-hidden
        >
          {current.flag}
        </span>
        <span className="hidden max-w-[4.5rem] truncate sm:inline">{current.native}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('nav.language')}
          className={`absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md ${
            isDark
              ? 'border-slate-700/80 bg-slate-900/95 text-slate-100'
              : 'border-slate-200 bg-white/95 text-slate-800 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100'
          }`}
        >
          <div
            className={`flex items-center gap-2 border-b px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase ${
              isDark
                ? 'border-slate-800 text-slate-500'
                : 'border-slate-100 text-slate-400 dark:border-slate-800'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            {t('nav.language')}
          </div>
          <ul className="p-1.5">
            {LANG_OPTIONS.map((opt) => {
              const selected = opt.value === lang;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setLang(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                      selected
                        ? isDark
                          ? 'bg-blue-600/20 text-blue-100'
                          : 'bg-blue-50 text-blue-800 dark:bg-blue-600/20 dark:text-blue-100'
                        : isDark
                          ? 'hover:bg-slate-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/40 text-base dark:bg-slate-800">
                      {opt.flag}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{opt.native}</span>
                      <span
                        className={`block truncate text-[10px] ${
                          isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </span>
                    {selected ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-400" />
                    ) : (
                      <span className="w-4" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
