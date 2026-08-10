import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { AuthUser } from '../types';
import { LoginIllustration } from './LoginIllustration';
import { useLanguage } from '../context/LanguageContext';
import { LanguageDropdown } from './LanguageDropdown';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, rememberMe: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage(t('login.needFields'));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(
          typeof data.error === 'string' ? data.error : t('login.invalid')
        );
        return;
      }

      if (!data.user) {
        setErrorMessage(t('login.failed'));
        return;
      }

      onLoginSuccess(data.user as AuthUser, rememberMe);
    } catch {
      setErrorMessage(t('login.serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  const controls = (
    <div className="flex items-center gap-2">
      <LanguageDropdown variant="light" />
    </div>
  );

  const formCard = (
    <div className="w-full max-w-md">
      <div className="mb-8 space-y-2">
        <p className="text-[11px] font-bold tracking-[0.2em] text-blue-600 uppercase dark:text-blue-400">
          AgencyOS
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {t('login.title')}
        </h1>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {t('login.welcome')}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-black/40"
      >
        {errorMessage && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <div className="space-y-2">
          <label
            htmlFor="login-email"
            className="block text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400"
          >
            {t('login.email')}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mail@gmail.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-3.5 pl-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="login-password"
            className="block text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400"
          >
            {t('login.password')}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-11 pl-10 text-sm tracking-widest text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3.5 text-slate-400 hover:text-blue-600"
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2.5 pt-1">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('login.remember')}
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-blue-400 disabled:opacity-70"
        >
          {isLoading ? t('login.loggingIn') : t('login.submit')}
        </button>
      </form>
    </div>
  );

  return (
    <div
      className="relative flex h-dvh max-h-dvh flex-col overflow-hidden text-slate-800 antialiased dark:text-slate-100"
      style={{ fontFamily: "'Geomini', 'Noto Sans Myanmar', sans-serif" }}
    >
      {/* ── Mobile ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:hidden">
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-b from-[#EEF2FF] to-white px-4 pt-6 pb-2 dark:from-slate-900 dark:to-slate-950">
          <div className="absolute top-3 right-3 z-20">{controls}</div>
          <div className="relative z-10 mx-auto flex max-w-sm justify-center pt-8">
            <LoginIllustration className="h-auto w-full max-w-[280px]" />
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{
              background:
                'radial-gradient(120% 100% at 50% 100%, #5C6BC0 0%, #3949AB 55%, transparent 56%)',
            }}
          />
          <svg
            className="absolute inset-x-0 bottom-0 w-full"
            viewBox="0 0 390 72"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 72 V36 C80 8 140 4 195 28 C260 54 320 58 390 24 V72 Z"
              fill="#5C6BC0"
            />
            <path
              d="M0 72 V44 C90 18 150 12 200 34 C265 58 330 62 390 32 V72 Z"
              fill="#3949AB"
            />
          </svg>
        </div>

        <div className="relative z-10 -mt-1 flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-50 px-5 pt-6 pb-10 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
          <div className="mx-auto w-full max-w-md">{formCard}</div>
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(420px,1fr)_minmax(480px,1.15fr)]">
        <section className="relative flex flex-col overflow-y-auto overscroll-contain bg-[radial-gradient(120%_80%_at_0%_0%,#dbeafe_0%,transparent_45%),radial-gradient(80%_60%_at_100%_100%,#e2e8f0_0%,transparent_40%)] from-slate-50 dark:bg-[radial-gradient(120%_80%_at_0%_0%,rgba(37,99,235,0.18)_0%,transparent_45%),linear-gradient(180deg,#020617,#0f172a)]">
          <div className="flex items-center justify-between px-8 pt-6 xl:px-14">
            <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
              AgencyOS
            </span>
            {controls}
          </div>

          <div className="flex flex-1 items-center justify-center px-8 py-10 xl:px-14">
            {formCard}
          </div>
        </section>

        <section className="relative overflow-hidden bg-white dark:bg-slate-950">
          <div
            className="absolute inset-y-0 right-0 w-[115%]"
            style={{
              background:
                'linear-gradient(145deg, #7E57C2 0%, #5C6BC0 35%, #3949AB 70%, #283593 100%)',
              borderTopLeftRadius: '48% 100%',
              borderBottomLeftRadius: '42% 100%',
            }}
          />
          <div className="relative z-10 flex h-full items-center justify-center px-8 py-12">
            <LoginIllustration className="h-auto w-full max-w-lg drop-shadow-xl" />
          </div>
        </section>
      </div>
    </div>
  );
};
