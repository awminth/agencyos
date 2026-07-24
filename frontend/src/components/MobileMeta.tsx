import React from 'react';

export type MobileMetaItem = {
  label: string;
  value: React.ReactNode;
};

/** Compact 2-column field grid for phone list cards. */
export const MobileMeta: React.FC<{ items: MobileMetaItem[] }> = ({ items }) => {
  const visible = items.filter(
    (i) => i.value !== null && i.value !== undefined && i.value !== ''
  );
  if (visible.length === 0) return null;

  return (
    <dl className="mobile-meta-grid">
      {visible.map((item) => (
        <div key={item.label} className="mobile-meta-item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};
