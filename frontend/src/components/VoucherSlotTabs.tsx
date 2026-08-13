import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface VoucherSlotTabsProps {
  activeSlot: 1 | 2;
  onChange: (slot: 1 | 2) => void;
}

export const VoucherSlotTabs: React.FC<VoucherSlotTabsProps> = ({
  activeSlot,
  onChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
          activeSlot === 1
            ? 'bg-blue-600 text-white'
            : 'border border-slate-200 bg-white text-slate-600'
        }`}
      >
        {t('settings.voucherSlot1')}
      </button>
      <button
        type="button"
        onClick={() => onChange(2)}
        className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
          activeSlot === 2
            ? 'bg-blue-600 text-white'
            : 'border border-slate-200 bg-white text-slate-600'
        }`}
      >
        {t('settings.voucherSlot2')}
      </button>
    </div>
  );
};
