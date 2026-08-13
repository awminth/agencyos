import React, { useEffect, useState } from 'react';
import { Invoice } from '../types';
import { Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DocumentSharePreview } from './DocumentSharePreview';
import { FormalInvoiceDocument } from './FormalInvoiceDocument';
import { VoucherSlotTabs } from './VoucherSlotTabs';
import {
  EMPTY_LETTERHEAD,
  parsePrintLetterheads,
  type PrintLetterhead,
} from '../utils/printLetterhead';

interface PrintableInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const PrintableInvoiceModal: React.FC<PrintableInvoiceModalProps> = ({
  invoice,
  onClose,
}) => {
  const { t } = useLanguage();
  const [voucher1, setVoucher1] = useState<PrintLetterhead>(EMPTY_LETTERHEAD);
  const [voucher2, setVoucher2] = useState<PrintLetterhead>(EMPTY_LETTERHEAD);
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  useEffect(() => {
    fetch('/api/settings/print')
      .then((r) => r.json())
      .then((data) => {
        const both = parsePrintLetterheads(data);
        setVoucher1(both.voucher1);
        setVoucher2(both.voucher2);
      })
      .catch(() => undefined);
  }, []);

  const issuer = activeSlot === 1 ? voucher1 : voucher2;
  const printAreaId = `formal-invoice-print-area-${activeSlot}`;
  const filename = `Invoice_V${activeSlot}_${invoice.invoiceNo}`;
  const slotLabel =
    activeSlot === 1 ? t('settings.voucherSlot1') : t('settings.voucherSlot2');

  return (
    <DocumentSharePreview
      title={`${t('invoices.formalPreview')} (${slotLabel})`}
      subtitle={invoice.invoiceNo}
      printAreaId={printAreaId}
      printFilename={filename}
      icon={Building2}
      onClose={onClose}
      toolbar={<VoucherSlotTabs activeSlot={activeSlot} onChange={setActiveSlot} />}
    >
      <FormalInvoiceDocument id={printAreaId} invoice={invoice} issuer={issuer} />
    </DocumentSharePreview>
  );
};
