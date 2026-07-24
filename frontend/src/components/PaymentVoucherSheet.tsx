import React, { useEffect, useState } from 'react';
import { InvoiceFeeType, InvoicePayment } from '../types';
import { Receipt } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { PosPrintPreview, PosReceipt } from './PosPrintPreview';

interface PrintSettingsData {
  agencyName: string;
  address: string;
  phone: string;
  logoData: string | null;
}

export type PaymentVoucherSheetProps =
  | {
      mode: 'payment';
      payment: InvoicePayment;
      totalAmount: number;
      totalPaid: number;
      remainAmount: number;
      onClose: () => void;
    }
  | {
      mode: 'summary';
      workerName: string;
      passportNo?: string;
      hostCompany?: string;
      serialNo?: string;
      feeType: InvoiceFeeType;
      totalAmount: number;
      totalPaid: number;
      remainAmount: number;
      payments: InvoicePayment[];
      currency?: MoneyCurrency | string;
      onClose: () => void;
    };

export const PaymentVoucherSheet: React.FC<PaymentVoucherSheetProps> = (props) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const [printSettings, setPrintSettings] = useState<PrintSettingsData>({
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

  const feeType = props.mode === 'payment' ? props.payment.feeType : props.feeType;
  const feeLabel =
    feeType === 'flight'
      ? t('workerModal.flightFee')
      : feeType === 'training'
        ? t('workerModal.trainingFee')
        : feeType === 'introduction'
          ? t('students.introductionFee')
        : t('workerModal.managementFee');

  const currency =
    props.mode === 'payment'
      ? ((props.payment.currency as MoneyCurrency) || 'JPY')
      : ((props.currency as MoneyCurrency) || 'JPY');

  const money = (n: number) => formatMoney(n, currency);

  const agencyName = printSettings.agencyName || 'Agency';
  const contactLine = [printSettings.address, printSettings.phone ? `Tel: ${printSettings.phone}` : '']
    .filter(Boolean)
    .join(' | ');

  const balanceFields = [
    { label: t('invoices.totalAmount'), value: money(props.totalAmount) },
    { label: t('invoices.totalPaid'), value: money(props.totalPaid) },
    { label: t('invoices.remainAmount'), value: money(props.remainAmount) },
  ];

  if (props.mode === 'payment') {
    const { payment } = props;
    const fields = [
      { label: t('invoices.colInvoice'), value: payment.invoiceNo || '—' },
      { label: t('invoices.colWorker'), value: payment.workerName || '—' },
      { label: t('invoices.feeType'), value: feeLabel },
      { label: t('invoices.payDate'), value: payment.paymentDate },
      { label: t('invoices.colReceipt'), value: payment.receiptNo || '—' },
      { label: t('invoices.totalAmount'), value: money(props.totalAmount) },
      { label: t('invoices.payAmount'), value: money(props.totalPaid) },
      { label: t('invoices.remainAmount'), value: money(props.remainAmount) },
    ];

    return (
      <PosPrintPreview
        title={t('invoices.voucherPreview')}
        printAreaId="payment-voucher-print-area"
        printFilename={`Payment_${payment.invoiceNo || payment.id}`}
        icon={Receipt}
        onClose={props.onClose}
        zIndexClass="z-[60]"
      >
        <PosReceipt
          id="payment-voucher-print-area"
          agencyName={agencyName}
          contactLine={contactLine || undefined}
          logoData={printSettings.logoData}
          badge="PAYMENT"
          dateLabel={`Date: ${new Date().toLocaleDateString()}`}
          title={t('invoices.voucherTitle')}
          subtitle={payment.invoiceNo || payment.id}
          fields={fields}
          amountLabel={t('invoices.payAmount')}
          amountValue={money(payment.amount)}
          notes={payment.notes}
          notesLabel={t('workerModal.notes')}
        />
      </PosPrintPreview>
    );
  }

  const { workerName, passportNo, hostCompany, serialNo, payments } = props;
  const fields = [
    { label: t('invoices.colWorker'), value: workerName },
    ...(serialNo ? [{ label: 'Serial', value: serialNo }] : []),
    ...(passportNo ? [{ label: 'Passport', value: passportNo }] : []),
    ...(hostCompany ? [{ label: t('invoices.colHost'), value: hostCompany }] : []),
    { label: t('invoices.feeType'), value: feeLabel },
    { label: t('invoices.paymentsOnVoucher'), value: String(payments.length) },
    ...balanceFields,
  ];

  const extraRows = payments.map((p, idx) => ({
    label: `${idx + 1}. ${p.paymentDate}${p.invoiceNo ? ` / ${p.invoiceNo}` : ''}`,
    value: money(p.amount),
  }));

  return (
    <PosPrintPreview
      title={t('invoices.summaryVoucherPreview')}
      printAreaId="summary-voucher-print-area"
      printFilename={`Summary_${workerName}`}
      icon={Receipt}
      onClose={props.onClose}
      zIndexClass="z-[60]"
    >
      <PosReceipt
        id="summary-voucher-print-area"
        agencyName={agencyName}
        contactLine={contactLine || undefined}
        logoData={printSettings.logoData}
        badge="SUMMARY"
        dateLabel={`Date: ${new Date().toLocaleDateString()}`}
        title={t('invoices.summaryVoucherTitle')}
        subtitle={feeLabel}
        fields={fields}
        amountLabel={t('invoices.totalPaid')}
        amountValue={money(props.totalPaid)}
        extraRows={extraRows.length ? extraRows : undefined}
      />
    </PosPrintPreview>
  );
};
