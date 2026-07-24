import Swal, { type SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type SwalTone = 'danger' | 'success' | 'error' | 'warning' | 'info';

const iconGlyph: Record<SwalTone, string> = {
  danger:
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
  success:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error:
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  warning:
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
  info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
};

function buildIconHtml(tone: SwalTone) {
  return `
    <div class="agency-swal__icon agency-swal__icon--${tone}" aria-hidden="true">
      <span class="agency-swal__icon-ring"></span>
      <span class="agency-swal__icon-glyph">${iconGlyph[tone]}</span>
    </div>
  `;
}

function fire(tone: SwalTone, options: SweetAlertOptions) {
  const confirmClass =
    tone === 'danger'
      ? 'agency-swal__btn agency-swal__btn--danger'
      : tone === 'success'
        ? 'agency-swal__btn agency-swal__btn--success'
        : tone === 'warning'
          ? 'agency-swal__btn agency-swal__btn--warning'
          : 'agency-swal__btn agency-swal__btn--primary';

  const { customClass: userCustom, html: userHtml, text: userText, ...rest } = options;

  return Swal.fire({
    buttonsStyling: false,
    reverseButtons: true,
    focusCancel: true,
    backdrop: 'rgba(15, 23, 42, 0.55)',
    showClass: {
      popup: 'agency-swal-in',
      backdrop: 'agency-swal-backdrop-in',
    },
    hideClass: {
      popup: 'agency-swal-out',
      backdrop: 'agency-swal-backdrop-out',
    },
    icon: undefined,
    iconHtml: undefined,
    ...rest,
    customClass: {
      container: 'agency-swal-container',
      popup: `agency-swal agency-swal--${tone}`,
      title: 'agency-swal__title',
      htmlContainer: 'agency-swal__text',
      actions: 'agency-swal__actions',
      confirmButton: confirmClass,
      cancelButton: 'agency-swal__btn agency-swal__btn--ghost',
      icon: 'agency-swal__native-icon-hide',
      ...(userCustom || {}),
    },
    html: `
      ${buildIconHtml(tone)}
      <div class="agency-swal__body">
        ${userHtml || (userText ? `<p class="agency-swal__msg">${userText}</p>` : '')}
      </div>
    `,
    text: undefined,
  });
}

export async function confirmDelete(options?: {
  title?: string;
  text?: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
  /** Use warning when related records exist */
  tone?: SwalTone;
}): Promise<boolean> {
  const tone = options?.tone || 'danger';
  const result = await fire(tone, {
    title: options?.title || 'ဖျက်ရန် သေချာပါသလား?',
    text: options?.html ? undefined : options?.text || 'ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍ မရနိုင်ပါ။',
    html: options?.html,
    showCancelButton: true,
    confirmButtonText: options?.confirmText || 'ဖျက်မည်',
    cancelButtonText: options?.cancelText || 'မလုပ်တော့ပါ',
    customClass:
      tone === 'warning'
        ? { confirmButton: 'agency-swal__btn agency-swal__btn--danger' }
        : undefined,
  });
  return result.isConfirmed;
}

export async function showError(title: string, text?: string): Promise<void> {
  await fire('error', {
    title,
    text,
    confirmButtonText: 'နားလည်ပါပြီ',
  });
}

export async function showSuccess(title: string, text?: string): Promise<void> {
  await fire('success', {
    title,
    text,
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

export async function showWarning(title: string, text?: string): Promise<void> {
  await fire('warning', {
    title,
    text,
    confirmButtonText: 'OK',
  });
}

/** Optional helper if needed later */
export async function showInfo(title: string, text?: string): Promise<void> {
  await fire('info', {
    title,
    text,
    confirmButtonText: 'OK',
  });
}
