/** Public brand assets (Marctober Tech). */
export const BRAND_LOGO_SRC = '/brand/marctober-logo.png';
export const BRAND_COVER_SRC = '/brand/marctober-cover.png';
export const BRAND_COVER_MOBILE_SRC = '/brand/marctober-cover-mobile.png';
export const BRAND_COVER_PANEL_SRC = '/brand/marctober-cover-panel.png';

/** Custom print logo when uploaded; otherwise the Marctober Tech mark. */
export function resolveBrandLogo(logoData?: string | null): string {
  const src = typeof logoData === 'string' ? logoData.trim() : '';
  return src || BRAND_LOGO_SRC;
}
