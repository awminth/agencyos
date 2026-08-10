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

const EMPTY_PRINT: PrintSettingsData = {
  agencyName: '',
  address: '',
  phone: '',
  logoData: null,
};

function parsePrintResponse(data: any): { voucher1: PrintSettingsData; voucher2: PrintSettingsData } {
  if (data?.voucher1 || data?.voucher2) {
    return {
      voucher1: {
        agencyName: data.voucher1?.agencyName || '',
        address: data.voucher1?.address || '',
        phone: data.voucher1?.phone || '',
        logoData: data.voucher1?.logoData || null,
      },
      voucher2: {
        agencyName: data.voucher2?.agencyName || '',
        address: data.voucher2?.address || '',
        phone: data.voucher2?.phone || '',
        logoData: data.voucher2?.logoData || null,
      },
    };
  }
  // Legacy flat response → use as voucher 1, copy for voucher 2
  const flat: PrintSettingsData = {
    agencyName: data?.agencyName || '',
    address: data?.address || '',
    phone: data?.phone || '',
    logoData: data?.logoData || null,
  };
  return { voucher1: flat, voucher2: { ...flat } };
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
      supervisingOrg?: string;
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
  const [voucher1, setVoucher1] = useState<PrintSettingsData>(EMPTY_PRINT);
  const [voucher2, setVoucher2] = useState<PrintSettingsData>(EMPTY_PRINT);
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  useEffect(() => {
    fetch('/api/settings/print')
      .then((r) => r.json())
      .then((data) => {
        const both = parsePrintResponse(data);
        setVoucher1(both.voucher1);
        setVoucher2(both.voucher2);
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

  const activePrint = activeSlot === 1 ? voucher1 : voucher2;
  const agencyName = activePrint.agencyName || 'Agency';
  const contactLine = [activePrint.address, activePrint.phone ? `Tel: ${activePrint.phone}` : '']
    .filter(Boolean)
    .join(' | ');

  const slotTabs = (
    <div className="no-print mb-3 flex gap-2">
      <button
        type="button"
        onClick={() => setActiveSlot(1)}
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
        onClick={() => setActiveSlot(2)}
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

  const balanceFields = [
    { label: t('invoices.totalAmount'), value: money(props.totalAmount) },
    { label: t('invoices.totalPaid'), value: money(props.totalPaid) },
    { label: t('invoices.remainAmount'), value: money(props.remainAmount) },
  ];

  if (props.mode === 'payment') {
    const { payment } = props;
    const fields = [
      { label: t('invoices.colInvoice'), value: payment.invoiceNo || '—' },
      {
        label:
          payment.feeType === 'introduction'
            ? t('students.schoolName')
            : t('invoices.colHost'),
        value: payment.workerName || '—',
      },
      { label: t('invoices.feeType'), value: feeLabel },
      { label: t('invoices.payDate'), value: payment.paymentDate },
      { label: t('invoices.colReceipt'), value: payment.receiptNo || '—' },
      { label: t('invoices.totalAmount'), value: money(props.totalAmount) },
      { label: t('invoices.payAmount'), value: money(props.totalPaid) },
      { label: t('invoices.remainAmount'), value: money(props.remainAmount) },
    ];

    const printAreaId = `payment-voucher-print-area-${activeSlot}`;

    return (
      <PosPrintPreview
        title={`${t('invoices.voucherPreview')} (${activeSlot === 1 ? t('settings.voucherSlot1') : t('settings.voucherSlot2')})`}
        printAreaId={printAreaId}
        printFilename={`Payment_V${activeSlot}_${payment.invoiceNo || payment.id}`}
        icon={Receipt}
        onClose={props.onClose}
        zIndexClass="z-[60]"
      >
        {slotTabs}
        <PosReceipt
          id={printAreaId}
          agencyName={agencyName}
          contactLine={contactLine || undefined}
          logoData={activePrint.logoData}
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

  const { workerName, passportNo, hostCompany, supervisingOrg, serialNo, payments } = props;
  const isStudent = props.feeType === 'introduction';
  const fields = [
    {
      label: isStudent ? t('students.schoolName') : t('invoices.colHost'),
      value: isStudent ? workerName : hostCompany || workerName,
    },
    ...(serialNo ? [{ label: 'Serial', value: serialNo }] : []),
    ...(passportNo ? [{ label: 'Passport', value: passportNo }] : []),
    ...(isStudent
      ? [
          ...(hostCompany
            ? [{ label: t('students.schoolAddress'), value: hostCompany }]
            : []),
        ]
      : [
          ...(supervisingOrg
            ? [{ label: t('reports.colSupervisingOrg'), value: supervisingOrg }]
            : []),
        ]),
    { label: t('invoices.feeType'), value: feeLabel },
    { label: t('invoices.paymentsOnVoucher'), value: String(payments.length) },
    ...balanceFields,
  ];

  const extraRows = payments.map((p, idx) => ({
    label: `${idx + 1}. ${p.paymentDate}${p.invoiceNo ? ` / ${p.invoiceNo}` : ''}`,
    value: money(p.amount),
  }));

  const summaryPrintId = `summary-voucher-print-area-${activeSlot}`;

  return (
    <PosPrintPreview
      title={`${t('invoices.summaryVoucherPreview')} (${activeSlot === 1 ? t('settings.voucherSlot1') : t('settings.voucherSlot2')})`}
      printAreaId={summaryPrintId}
      printFilename={`Summary_V${activeSlot}_${workerName}`}
      icon={Receipt}
      onClose={props.onClose}
      zIndexClass="z-[60]"
    >
      {slotTabs}
      <PosReceipt
        id={summaryPrintId}
        agencyName={agencyName}
        contactLine={contactLine || undefined}
        logoData={activePrint.logoData}
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
