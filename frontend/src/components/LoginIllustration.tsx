import React from 'react';

/** Flat illustration: person at desk with floating UI panels (login hero art). */
export const LoginIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 520 420"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Floating panels */}
    <g>
      <rect x="48" y="52" width="118" height="88" rx="14" fill="#EEF2FF" stroke="#C5CAE9" strokeWidth="2" />
      <circle cx="78" cy="86" r="16" fill="#FFD54F" />
      <rect x="102" y="74" width="48" height="8" rx="4" fill="#9FA8DA" />
      <rect x="102" y="90" width="36" height="6" rx="3" fill="#C5CAE9" />
      <rect x="64" y="112" width="86" height="14" rx="7" fill="#5C6BC0" />
    </g>

    <g>
      <rect x="340" y="28" width="132" height="100" rx="14" fill="#E8EAF6" stroke="#9FA8DA" strokeWidth="2" />
      <rect x="356" y="48" width="40" height="28" rx="6" fill="#26A69A" />
      <rect x="404" y="48" width="48" height="8" rx="4" fill="#7986CB" />
      <rect x="404" y="64" width="36" height="6" rx="3" fill="#C5CAE9" />
      <rect x="356" y="92" width="100" height="8" rx="4" fill="#C5CAE9" />
      <rect x="356" y="106" width="72" height="8" rx="4" fill="#E0E0E0" />
    </g>

    <g>
      <rect x="28" y="180" width="100" height="72" rx="12" fill="#FFF8E1" stroke="#FFD54F" strokeWidth="2" />
      <circle cx="52" cy="208" r="12" fill="#FFB300" />
      <rect x="72" y="200" width="40" height="7" rx="3.5" fill="#FFCC80" />
      <rect x="72" y="214" width="28" height="6" rx="3" fill="#FFE082" />
      <rect x="44" y="230" width="64" height="10" rx="5" fill="#FFA000" />
    </g>

    <g>
      <rect x="380" y="160" width="110" height="78" rx="12" fill="#E0F2F1" stroke="#80CBC4" strokeWidth="2" />
      <path d="M400 210 L418 192 L436 204 L458 178" stroke="#26A69A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="458" cy="178" r="5" fill="#00897B" />
      <rect x="400" y="218" width="70" height="8" rx="4" fill="#B2DFDB" />
    </g>

    {/* Decorative dots / icons */}
    <circle cx="200" y="40" r="8" fill="#FFD54F" />
    <circle cx="460" y="250" r="6" fill="#26A69A" />
    <rect x="170" y="300" width="14" height="14" rx="3" fill="#7986CB" transform="rotate(15 177 307)" />

    {/* Stool */}
    <ellipse cx="248" cy="348" rx="42" ry="10" fill="#C5CAE9" opacity="0.55" />
    <rect x="228" y="300" width="40" height="12" rx="4" fill="#5C6BC0" />
    <path d="M236 312 L228 348 M260 312 L268 348 M248 312 L248 348" stroke="#3949AB" strokeWidth="4" strokeLinecap="round" />

    {/* Person body */}
    <ellipse cx="248" cy="248" rx="48" ry="58" fill="#5C6BC0" />
    {/* Legs */}
    <path d="M220 290 Q210 320 228 348" stroke="#3949AB" strokeWidth="18" strokeLinecap="round" fill="none" />
    <path d="M276 290 Q290 318 268 348" stroke="#3949AB" strokeWidth="18" strokeLinecap="round" fill="none" />
    {/* Arms */}
    <path d="M200 230 Q160 210 148 168" stroke="#5C6BC0" strokeWidth="16" strokeLinecap="round" fill="none" />
    <path d="M296 230 Q340 200 360 150" stroke="#5C6BC0" strokeWidth="16" strokeLinecap="round" fill="none" />
    {/* Hands */}
    <circle cx="148" cy="164" r="12" fill="#FFCC80" />
    <circle cx="360" cy="146" r="12" fill="#FFCC80" />

    {/* Head */}
    <circle cx="248" cy="168" r="36" fill="#FFCC80" />
    {/* Hair */}
    <path
      d="M214 158 Q218 128 248 124 Q278 128 282 158 Q275 140 248 138 Q221 140 214 158Z"
      fill="#37474F"
    />
    {/* Face details */}
    <circle cx="236" cy="168" r="3.5" fill="#5D4037" />
    <circle cx="260" cy="168" r="3.5" fill="#5D4037" />
    <path d="M240 182 Q248 188 256 182" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Shirt accent */}
    <path d="M228 220 Q248 236 268 220" stroke="#E8EAF6" strokeWidth="3" strokeLinecap="round" fill="none" />

    {/* Small floating chip near hand */}
    <rect x="120" y="120" width="44" height="32" rx="8" fill="white" stroke="#9FA8DA" strokeWidth="2" />
    <circle cx="134" cy="136" r="7" fill="#FFD54F" />
    <rect x="146" y="130" width="12" height="5" rx="2.5" fill="#C5CAE9" />
    <rect x="146" y="140" width="8" height="4" rx="2" fill="#E0E0E0" />
  </svg>
);
