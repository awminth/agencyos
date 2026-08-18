import React from 'react';
import { BRAND_COVER_SRC } from '../utils/brand';

/** Login / quotation hero — Marctober Tech brand image. */
export const LoginIllustration: React.FC<{
  className?: string;
  src?: string;
  alt?: string;
}> = ({ className = '', src = BRAND_COVER_SRC, alt = 'Marctober Tech' }) => (
  <img src={src} alt={alt} className={`object-contain ${className}`} />
);
