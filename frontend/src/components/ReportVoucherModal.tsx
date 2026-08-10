import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { PosPrintPreview, PosReceipt } from './PosPrintPreview';

export interface PrintSettingsData {
  agencyName: string;
  address: string;
  phone: string;
  logoData: string | null;
}

export interface VoucherField {
  label: string;
  value: string;
}

export interface ReportVoucherData {
  title: string;
  subtitle?: string;
  badge?: string;
  fields: VoucherField[];
  amountLabel?: string;
  amountValue?: string;
  status?: string;
  notes?: string;
}

interface ReportVoucherModalProps {
  voucher: ReportVoucherData;
  onClose: () => void;
}

export const ReportVoucherModal: React.FC<ReportVoucherModalProps> = ({
  voucher,
  onClose,
}) => {
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
        const src = data?.voucher1 || data;
        setPrintSettings({
          agencyName: src.agencyName || '',
          address: src.address || '',
          phone: src.phone || '',
          logoData: src.logoData || null,
        });
      })
      .catch(() => undefined);
  }, []);

  const agencyName = printSettings.agencyName || 'Agency';
  const contactLine = [printSettings.address, printSettings.phone ? `Tel: ${printSettings.phone}` : '']
    .filter(Boolean)
    .join(' | ');

  return (
    <PosPrintPreview
      title="Voucher Preview"
      printAreaId="report-voucher-print-area"
      printFilename={voucher.title}
      icon={FileText}
      onClose={onClose}
    >
      <PosReceipt
        id="report-voucher-print-area"
        agencyName={agencyName}
        contactLine={contactLine || undefined}
        logoData={printSettings.logoData}
        badge={voucher.badge}
        dateLabel={`Date: ${new Date().toLocaleDateString()}`}
        title={voucher.title}
        subtitle={voucher.subtitle}
        fields={voucher.fields}
        amountLabel={voucher.amountLabel}
        amountValue={voucher.amountValue}
        status={voucher.status}
        notes={voucher.notes}
      />
    </PosPrintPreview>
  );
};
