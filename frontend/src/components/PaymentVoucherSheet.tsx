import React, { useEffect, useState } from 'react';
import { InvoiceFeeType, InvoicePayment } from '../types';
import { Receipt } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { DocumentSharePreview } from './DocumentSharePreview';
import { FormalVoucherDocument } from './FormalVoucherDocument';
import { VoucherSlotTabs } from './VoucherSlotTabs';
import {
  EMPTY_LETTERHEAD,
  parsePrintLetterheads,
  type PrintLetterhead,
} from '../utils/printLetterhead';

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
  const slotLabel =
    activeSlot === 1 ? t('settings.voucherSlot1') : t('settings.voucherSlot2');
  const slotTabs = (
    <VoucherSlotTabs activeSlot={activeSlot} onChange={setActiveSlot} />
  );

  if (props.mode === 'payment') {
    const { payment } = props;
    const isStudent = payment.feeType === 'introduction';
    const billedName = payment.workerName || '—';
    const printAreaId = `payment-voucher-print-area-${activeSlot}`;
    const paidAmount = money(payment.amount);

    return (
      <DocumentSharePreview
        title={`${t('invoices.voucherPreview')} (${slotLabel})`}
        subtitle={payment.invoiceNo || payment.id}
        printAreaId={printAreaId}
        printFilename={`Payment_V${activeSlot}_${payment.invoiceNo || payment.id}`}
        icon={Receipt}
        onClose={props.onClose}
        zIndexClass="z-[60]"
        toolbar={slotTabs}
      >
        <FormalVoucherDocument
          id={printAreaId}
          docTitle="VOUCHER"
          docNoLabel={t('invoices.colInvoice')}
          docNo={payment.invoiceNo || payment.id}
          dateLabel={t('invoices.payDate')}
          dateValue={payment.paymentDate}
          billedToLabel={isStudent ? t('students.schoolName') : t('invoices.billedTo')}
          billedToName={billedName}
          introText={t('invoices.voucherIntro')}
          subjectLabel={t('invoices.feeType')}
          subject={feeLabel}
          highlightLabel={t('invoices.payAmount')}
          highlightValue={paidAmount}
          issuer={activePrint}
          lines={[
            {
              description: `${feeLabel} — ${t('invoices.voucherTitle')}`,
              detail: payment.receiptNo
                ? `${t('invoices.colReceipt')}: ${payment.receiptNo}`
                : undefined,
              qty: 1,
              unitPrice: paidAmount,
              amount: paidAmount,
            },
          ]}
          remarksLabel={t('invoices.remarks')}
          remarks={payment.notes}
          totals={[
            { label: t('invoices.totalAmount'), value: money(props.totalAmount) },
            { label: t('invoices.payAmount'), value: paidAmount },
            {
              label: t('invoices.remainAmount'),
              value: money(props.remainAmount),
              emphasis: true,
            },
          ]}
        />
      </DocumentSharePreview>
    );
  }

  const { workerName, hostCompany, supervisingOrg, payments } = props;
  const isStudent = props.feeType === 'introduction';
  const billedName = isStudent ? workerName : hostCompany || workerName;
  const summaryPrintId = `summary-voucher-print-area-${activeSlot}`;
  const totalPaidStr = money(props.totalPaid);

  return (
    <DocumentSharePreview
      title={`${t('invoices.summaryVoucherPreview')} (${slotLabel})`}
      subtitle={feeLabel}
      printAreaId={summaryPrintId}
      printFilename={`Summary_V${activeSlot}_${workerName}`}
      icon={Receipt}
      onClose={props.onClose}
      zIndexClass="z-[60]"
      toolbar={slotTabs}
    >
      <FormalVoucherDocument
        id={summaryPrintId}
        docTitle="VOUCHER"
        docNoLabel={t('invoices.feeType')}
        docNo={feeLabel}
        dateLabel={t('invoices.invoiceDate')}
        dateValue={new Date().toISOString().split('T')[0]}
        billedToLabel={isStudent ? t('students.schoolName') : t('invoices.billedTo')}
        billedToName={billedName || '—'}
        introText={
          supervisingOrg && !isStudent
            ? `${t('reports.colSupervisingOrg')}: ${supervisingOrg}`
            : t('invoices.voucherIntro')
        }
        subjectLabel={t('invoices.paymentsOnVoucher')}
        subject={String(payments.length)}
        highlightLabel={t('invoices.totalPaid')}
        highlightValue={totalPaidStr}
        issuer={activePrint}
        lines={
          payments.length > 0
            ? payments.map((p) => ({
                description: `${t('invoices.payDate')}: ${p.paymentDate}`,
                detail: [p.invoiceNo, p.receiptNo].filter(Boolean).join(' · ') || undefined,
                qty: 1,
                unitPrice: money(p.amount),
                amount: money(p.amount),
              }))
            : [
                {
                  description: t('invoices.summaryVoucherTitle'),
                  qty: 1,
                  unitPrice: totalPaidStr,
                  amount: totalPaidStr,
                },
              ]
        }
        remarksLabel={t('invoices.remarks')}
        totals={[
          { label: t('invoices.totalAmount'), value: money(props.totalAmount) },
          { label: t('invoices.totalPaid'), value: totalPaidStr },
          {
            label: t('invoices.remainAmount'),
            value: money(props.remainAmount),
            emphasis: true,
          },
        ]}
      />
    </DocumentSharePreview>
  );
};
