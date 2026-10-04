import React, { useId } from 'react';

export type AgencyStampVariant = 'jstars' | 'maystars';

interface AgencyStampProps {
  /** Voucher 1 → J Stars; Voucher 2 → May Stars (SVG fallback only) */
  variant: AgencyStampVariant;
  /** Uploaded stamp image from Print Settings — preferred over SVG */
  imageSrc?: string | null;
  className?: string;
  size?: number;
}

/**
 * Company stamp on invoices.
 * If Print Settings has an uploaded stamp image, that image is shown as-is.
 * Otherwise falls back to the built-in circular SVG seal.
 */
export const AgencyStamp: React.FC<AgencyStampProps> = ({
  variant,
  imageSrc,
  className = '',
  size = 112,
}) => {
  const uid = useId().replace(/:/g, '');
  const topId = `stamp-top-${variant}-${uid}`;
  const bottomId = `stamp-bot-${variant}-${uid}`;

  const topName =
    variant === 'jstars' ? 'J Stars International' : 'May Stars International';
  const bottomName = 'Co., Ltd *';
  const ink = '#0057FF';
  const font =
    'Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif';

  const uploaded = typeof imageSrc === 'string' ? imageSrc.trim() : '';
  if (uploaded) {
    return (
      <img
        src={uploaded}
        alt={`${topName} stamp`}
        width={size}
        height={size}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          background: 'transparent',
          display: 'block',
        }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`${topName} ${bottomName} stamp`}
      style={{ background: 'transparent', display: 'block' }}
    >
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="none"
        stroke={ink}
        strokeWidth="6.5"
      />
      <circle
        cx="100"
        cy="100"
        r="70"
        fill="none"
        stroke={ink}
        strokeWidth="2.4"
      />

      <defs>
        <path id={topId} d="M 22,108 A 82,82 0 0,1 178,108" fill="none" />
        <path id={bottomId} d="M 178,108 A 82,82 0 0,1 22,108" fill="none" />
      </defs>

      <text
        fill={ink}
        fontFamily={font}
        fontSize="12.2"
        fontWeight="700"
        letterSpacing="0.4"
      >
        <textPath
          href={`#${topId}`}
          xlinkHref={`#${topId}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {topName}
        </textPath>
      </text>

      <text
        fill={ink}
        fontFamily={font}
        fontSize="12.2"
        fontWeight="700"
        letterSpacing="0.8"
      >
        <textPath
          href={`#${bottomId}`}
          xlinkHref={`#${bottomId}`}
          startOffset="50%"
          textAnchor="middle"
        >
          {bottomName}
        </textPath>
      </text>

      <text
        x="100"
        y="96"
        textAnchor="middle"
        fill={ink}
        fontFamily={font}
        fontSize="13.5"
        fontWeight="500"
      >
        No...........
      </text>
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fill={ink}
        fontFamily={font}
        fontSize="13.5"
        fontWeight="500"
      >
        Date.....
      </text>
    </svg>
  );
};

export function stampVariantForSlot(slot: 1 | 2): AgencyStampVariant {
  return slot === 1 ? 'jstars' : 'maystars';
}
