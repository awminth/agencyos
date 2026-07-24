import React, { useEffect, useState } from 'react';
import { Invoice } from '../types';
import { Building2 } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import type { MoneyCurrency } from '../utils/currency';
import { PosPrintPreview, PosReceipt } from './PosPrintPreview';

interface PrintSettings {
  agencyName: string;
  address: string;
  phone: string;
  logoData: string | null;
}

interface PrintableInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const PrintableInvoiceModal: React.FC<PrintableInvoiceModalProps> = ({
  invoice,
  onClose,
}) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const money = (amount: number) =>
    formatMoney(amount, (invoice.currency as MoneyCurrency) || 'JPY');
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    agencyName: '',
    address: '',
    phone: '',
    logoData: null,
  });

  useEffect(() => {
    fetch('/api/settings/print')
      .then((r) => r.json())
      .then((data) => {
        setPrintSettings({
          agencyName: data.agencyName || '',
          address: data.address || '',
          phone: data.phone || '',
          logoData: data.logoData || null,
        });
      })
      .catch(() => undefined);
  }, []);

  const agencyName = printSettings.agencyName || 'Overseas Employment Agency';
  const contactLine = [
    printSettings.address,
    printSettings.phone ? `Tel: ${printSettings.phone}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const subjectLabel = invoice.feeType === 'introduction' ? 'Student' : 'Worker';
  const serviceLabel =
    invoice.feeType === 'flight'
      ? 'Flight Fee'
      : invoice.feeType === 'training'
        ? 'Training Fee'
        : invoice.feeType === 'introduction'
          ? 'Introduction Fee'
          : 'Management & Support Fee';

  const fields = [
    { label: 'Host / AO', value: invoice.hostCompany },
    { label: 'Supervising Org', value: invoice.supervisingOrg || '—' },
    { label: 'Billing Cycle', value: invoice.billingPeriod },
    { label: subjectLabel, value: invoice.workerName },
    { label: 'Passport', value: invoice.passportNo },
    { label: 'Next Due', value: invoice.nextInvoiceDate || '—' },
    { label: 'Service', value: serviceLabel },
    { label: t('invoices.totalAmount'), value: money(invoice.totalAmount) },
    { label: t('invoices.totalPaid'), value: money(invoice.amountReceived) },
    { label: t('invoices.remainAmount'), value: money(invoice.outstandingAmount) },
  ];

  const extraRows = invoice.receiptNo
    ? [
        {
          label: 'Receipt No',
          value: `${invoice.receiptNo}${invoice.paymentReceivedDate ? ` (${invoice.paymentReceivedDate})` : ''}`,
        },
      ]
    : undefined;

  return (
    <PosPrintPreview
      title="Invoice / Receipt Preview"
      printAreaId="official-invoice-print-area"
      printFilename={`Invoice_${invoice.invoiceNo}`}
      icon={Building2}
      onClose={onClose}
    >
      <PosReceipt
        id="official-invoice-print-area"
        agencyName={agencyName}
        contactLine={contactLine || undefined}
        logoData={printSettings.logoData}
        badge="INVOICE"
        dateLabel={`Date: ${invoice.lastInvoiceDate}`}
        title={invoice.invoiceNo}
        subtitle="Overseas Employment Service"
        fields={fields}
        amountLabel={t('invoices.remainAmount')}
        amountValue={money(invoice.outstandingAmount)}
        status={invoice.status}
        notes={
          invoice.notes ||
          'Payment due within 15 days from issue date via bank wire transfer.'
        }
        notesLabel="Payment Notes"
        extraRows={extraRows}
        footerLeft="Prepared By"
        footerRight="Authorized"
      />
    </PosPrintPreview>
  );
};
