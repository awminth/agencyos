import React, { useState, useEffect, useMemo } from 'react';
import {
  UpcomingInvoiceReportItem,
  OutstandingBalanceReportItem,
  ContractExpiryReportItem,
  FeePaymentSummary,
  FeeType,
  StudentFeePaymentSummary,
} from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { ExportButtons } from './ExportButtons';
import {
  FileText,
  Calendar,
  Receipt,
  Users,
  Plane,
  Printer,
  GraduationCap,
  Briefcase,
  Search,
} from 'lucide-react';
import { TablePagination, usePagination } from './TablePagination';
import { MobileFilterToggle } from './MobileFilterToggle';
import { MobileMeta } from './MobileMeta';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import {
  ReportVoucherModal,
  type ReportVoucherData,
} from './ReportVoucherModal';
import type { ReportSection } from '../types/reports';

export const ReportsView: React.FC<{ activeSection: ReportSection }> = ({
  activeSection: reportTab,
}) => {
  const { t } = useLanguage();
  const { formatMoney, convert, label: currencyLabel } = useCurrency();
  const money = (amount: number, currency?: string) =>
    formatMoney(amount, (currency as MoneyCurrency) || 'JPY');
  const moneyNum = (amount: number, currency?: string) =>
    convert(amount, (currency as MoneyCurrency) || 'JPY');
  const [feeFilter, setFeeFilter] = useState<'all' | 'outstanding'>('outstanding');
  const [feeTypeFilter, setFeeTypeFilter] = useState<'all' | FeeType>('all');
  const [feeSearch, setFeeSearch] = useState('');
  const [feeDateFrom, setFeeDateFrom] = useState('');
  const [feeDateTo, setFeeDateTo] = useState('');
  const [studentFeeFilter, setStudentFeeFilter] = useState<'all' | 'outstanding'>('outstanding');
  const [studentFeeSearch, setStudentFeeSearch] = useState('');
  const [studentFeeDateFrom, setStudentFeeDateFrom] = useState('');
  const [studentFeeDateTo, setStudentFeeDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [upcomingData, setUpcomingData] = useState<UpcomingInvoiceReportItem[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingBalanceReportItem[]>([]);
  const [expiryData, setExpiryData] = useState<ContractExpiryReportItem[]>([]);
  const [feeData, setFeeData] = useState<FeePaymentSummary[]>([]);
  const [studentFeeData, setStudentFeeData] = useState<StudentFeePaymentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [voucher, setVoucher] = useState<ReportVoucherData | null>(null);
  const notAvailable = t('reports.notAvailable');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        fetch('/api/reports/upcoming-invoices').then((res) => res.json()),
        fetch('/api/reports/outstanding-balances').then((res) => res.json()),
        fetch('/api/reports/contract-expirations').then((res) => res.json()),
        fetch('/api/reports/fee-payments').then((res) => res.json()),
        fetch('/api/reports/student-fee-payments').then((res) => res.json()),
      ]);
      setUpcomingData(r1 || []);
      setOutstandingData(r2 || []);
      setExpiryData(r3 || []);
      setFeeData(r4 || []);
      setStudentFeeData(r5 || []);
    } catch (err) {
      console.error('Failed to fetch report data', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeeData = feeData.filter((item) => {
    if (feeFilter === 'outstanding' && item.outstandingAmount <= 0) return false;
    if (feeTypeFilter !== 'all' && item.feeType !== feeTypeFilter) return false;
    if (feeDateFrom || feeDateTo) {
      const d = item.lastPaymentDate || '';
      if (!d) return false;
      if (feeDateFrom && d < feeDateFrom) return false;
      if (feeDateTo && d > feeDateTo) return false;
    }
    const q = feeSearch.trim().toLowerCase();
    if (q) {
      const hay = [
        item.workerName,
        item.serialNo,
        item.passportNo,
        item.hostCompany,
        item.feeType,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredStudentFeeData = studentFeeData.filter((item) => {
    if (studentFeeFilter === 'outstanding' && item.outstandingAmount <= 0) return false;
    if (studentFeeDateFrom || studentFeeDateTo) {
      const d = item.lastPaymentDate || '';
      if (!d) return false;
      if (studentFeeDateFrom && d < studentFeeDateFrom) return false;
      if (studentFeeDateTo && d > studentFeeDateTo) return false;
    }
    const q = studentFeeSearch.trim().toLowerCase();
    if (q) {
      const hay = [
        item.studentName,
        item.serialNo,
        item.passportNo,
        item.hostCompany,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeFilterCount =
    (feeSearch.trim() ? 1 : 0) +
    (feeFilter !== 'outstanding' ? 1 : 0) +
    (feeTypeFilter !== 'all' ? 1 : 0) +
    (feeDateFrom ? 1 : 0) +
    (feeDateTo ? 1 : 0);

  const studentActiveFilterCount =
    (studentFeeSearch.trim() ? 1 : 0) +
    (studentFeeFilter !== 'outstanding' ? 1 : 0) +
    (studentFeeDateFrom ? 1 : 0) +
    (studentFeeDateTo ? 1 : 0);

  const {
    page: upPage,
    setPage: setUpPage,
    pageSize: upPageSize,
    setPageSize: setUpPageSize,
    totalPages: upTotalPages,
    pagedItems: upPaged,
    from: upFrom,
    to: upTo,
    total: upTotal,
  } = usePagination(upcomingData, 10);

  const {
    page: outPage,
    setPage: setOutPage,
    pageSize: outPageSize,
    setPageSize: setOutPageSize,
    totalPages: outTotalPages,
    pagedItems: outPaged,
    from: outFrom,
    to: outTo,
    total: outTotal,
  } = usePagination(outstandingData, 10);

  const {
    page: feePage,
    setPage: setFeePage,
    pageSize: feePageSize,
    setPageSize: setFeePageSize,
    totalPages: feeTotalPages,
    pagedItems: feePaged,
    from: feeFrom,
    to: feeTo,
    total: feeTotal,
  } = usePagination(filteredFeeData, 10);

  const {
    page: expPage,
    setPage: setExpPage,
    pageSize: expPageSize,
    setPageSize: setExpPageSize,
    totalPages: expTotalPages,
    pagedItems: expPaged,
    from: expFrom,
    to: expTo,
    total: expTotal,
  } = usePagination(expiryData, 10);

  const {
    page: studentFeePage,
    setPage: setStudentFeePage,
    pageSize: studentFeePageSize,
    setPageSize: setStudentFeePageSize,
    totalPages: studentFeeTotalPages,
    pagedItems: studentFeePaged,
    from: studentFeeFrom,
    to: studentFeeTo,
    total: studentFeeTotal,
  } = usePagination(filteredStudentFeeData, 10);

  const feeTypeLabel = (type: string) =>
    type === 'flight'
      ? t('workerModal.flightFee')
      : type === 'training'
        ? t('workerModal.trainingFee')
        : type === 'introduction'
          ? t('students.introductionFee')
        : t('workerModal.managementFee');

  const feeTypeBadgeLabel = (type: string) =>
    type === 'flight'
      ? t('reports.badgeFlight')
      : type === 'training'
        ? t('reports.badgeTraining')
        : type === 'introduction'
          ? t('reports.badgeStudents')
        : t('reports.badgeManagement');

  const feeTypePillClass = (type: string) =>
    type === 'flight'
      ? 'pill pill-blue'
      : type === 'training'
        ? 'pill pill-amber'
        : type === 'introduction'
          ? 'pill pill-blue'
        : 'pill pill-emerald';

  const feeSummary = useMemo(() => {
    const inDate = (item: FeePaymentSummary) => {
      if (!feeDateFrom && !feeDateTo) return true;
      const d = item.lastPaymentDate || '';
      if (!d) return false;
      if (feeDateFrom && d < feeDateFrom) return false;
      if (feeDateTo && d > feeDateTo) return false;
      return true;
    };
    const base = feeData.filter((i) => {
      if (feeFilter === 'outstanding' && i.outstandingAmount <= 0) return false;
      return inDate(i);
    });
    return (['management', 'flight', 'training'] as FeeType[]).map((ft) => {
      const rows = base.filter((i) => i.feeType === ft);
      return {
        feeType: ft,
        count: rows.length,
        outstanding: rows.reduce((s, r) => s + (r.outstandingAmount || 0), 0),
        received: rows.reduce((s, r) => s + (r.amountReceived || 0), 0),
        due: rows.reduce((s, r) => s + (r.totalDue || 0), 0),
      };
    });
  }, [feeData, feeFilter, feeDateFrom, feeDateTo]);

  const reportStatusLabel = (status: string) => {
    if (status === 'Active') return t('status.active');
    if (status === 'Contract Ended') return t('status.ended');
    if (status === 'Absconded') return t('status.absconded');
    if (status === 'Paid') return t('status.paid');
    if (status === 'Partial') return t('status.partial');
    if (status === 'Pending') return t('status.pending');
    if (status === 'Overdue') return t('status.overdue');
    return status;
  };

  const receiptStatusLabel = (status: string) => {
    if (status === 'Receipt Sent') return t('reports.receiptSent');
    if (status === 'Receipt Pending') return t('reports.receiptPending');
    return status;
  };

  const dayLabel = (days: number) => t('reports.days', { count: days });

  const openUpcomingVoucher = (item: UpcomingInvoiceReportItem) => {
    setVoucher({
      title: t('reports.voucherUpcoming'),
      subtitle: t('reports.voucherUpcomingSubtitle'),
      badge: t('reports.badgeUpcoming'),
      fields: [
        { label: t('reports.colWorker'), value: item.workerName },
        { label: t('reports.colSerial'), value: item.serialNo },
        { label: t('reports.colPassport'), value: item.passportNo },
        { label: t('reports.colHostCompany'), value: item.hostCompany },
        { label: t('reports.colSupervisingOrg'), value: item.supervisingOrg },
        { label: t('reports.colLastInvoice'), value: item.lastInvoiceDate },
        { label: t('reports.colNextInvoice'), value: item.nextInvoiceDate },
        {
          label: t('reports.colDaysRemaining'),
          value: dayLabel(item.daysRemaining),
        },
      ],
      amountLabel: t('reports.voucherAmountDue'),
      amountValue: money(item.managementFee, item.currency || 'JPY'),
    });
  };

  const openOutstandingVoucher = (item: OutstandingBalanceReportItem) => {
    setVoucher({
      title: t('reports.voucherOutstanding'),
      subtitle: item.invoiceNo,
      badge: t('reports.badgeOutstanding'),
      fields: [
        { label: t('reports.colInvoiceNo'), value: item.invoiceNo },
        { label: t('reports.colFeeType'), value: feeTypeLabel(item.feeType || 'management') },
        { label: t('reports.colWorker'), value: item.workerName },
        { label: t('reports.colPassport'), value: item.passportNo },
        { label: t('reports.colHostCompany'), value: item.hostCompany },
        { label: t('reports.colReceiptNo'), value: item.receiptNo || notAvailable },
        {
          label: t('reports.colPaymentDate'),
          value: item.paymentReceivedDate || notAvailable,
        },
        {
          label: t('reports.colReceiptStatus'),
          value: receiptStatusLabel(item.receiptSentStatus),
        },
      ],
      amountLabel: t('reports.voucherBalanceDue'),
      amountValue: money(item.outstandingAmount, item.currency),
      status: `${t('reports.colTotal')} ${money(item.totalAmount, item.currency)} · ${t('reports.colReceived')} ${money(item.amountReceived, item.currency)}`,
    });
  };

  const openFeesVoucher = (item: FeePaymentSummary) => {
    setVoucher({
      title: `${feeTypeLabel(item.feeType)} ${t('reports.voucherSuffix')}`,
      subtitle: item.workerName,
      badge: feeTypeBadgeLabel(item.feeType),
      fields: [
        { label: t('reports.colWorker'), value: item.workerName },
        { label: t('reports.colSerial'), value: item.serialNo },
        { label: t('reports.colPassport'), value: item.passportNo },
        { label: t('reports.colHostCompany'), value: item.hostCompany },
        { label: t('reports.colFeeType'), value: feeTypeLabel(item.feeType) },
        {
          label: t('reports.colInvoicesInstallments'),
          value: String(item.paymentCount),
        },
        {
          label: t('reports.colLastPayment'),
          value: item.lastPaymentDate || notAvailable,
        },
      ],
      amountLabel: t('reports.colOutstanding'),
      amountValue: money(item.outstandingAmount, item.currency),
      status: `${reportStatusLabel(item.status)} · ${t('reports.voucherDue')} ${money(item.totalDue, item.currency)} · ${t('reports.voucherPaid')} ${money(item.amountReceived, item.currency)}`,
    });
  };

  const openStudentFeesVoucher = (item: StudentFeePaymentSummary) => {
    setVoucher({
      title: `${t('students.introductionFee')} ${t('reports.voucherSuffix')}`,
      subtitle: item.studentName,
      badge: t('reports.badgeStudents'),
      fields: [
        { label: t('reports.colWorker'), value: item.studentName },
        { label: t('reports.colSerial'), value: item.serialNo },
        { label: t('reports.colPassport'), value: item.passportNo },
        { label: t('reports.colHostCompany'), value: item.hostCompany },
        { label: t('reports.colFeeType'), value: feeTypeLabel(item.feeType) },
        {
          label: t('reports.colInstallments'),
          value: String(item.paymentCount),
        },
        {
          label: t('reports.colLastPayment'),
          value: item.lastPaymentDate || notAvailable,
        },
      ],
      amountLabel: t('reports.colOutstanding'),
      amountValue: money(item.outstandingAmount, item.currency),
      status: `${reportStatusLabel(item.status)} · ${t('reports.voucherDue')} ${money(item.totalDue, item.currency)} · ${t('reports.voucherPaid')} ${money(item.amountReceived, item.currency)}`,
    });
  };

  const openExpiryVoucher = (item: ContractExpiryReportItem) => {
    setVoucher({
      title: t('reports.voucherExpiry'),
      subtitle: item.workerName,
      badge: t('reports.badgeContract'),
      fields: [
        { label: t('reports.colWorker'), value: item.workerName },
        { label: t('reports.colSerial'), value: item.serialNo },
        { label: t('reports.colPassport'), value: item.passportNo },
        { label: t('reports.colVisaType'), value: item.visaType },
        { label: t('reports.colHostCompany'), value: item.hostCompany },
        { label: t('reports.colDepartureDate'), value: item.departureDate },
        {
          label: t('reports.colContractEndDate'),
          value: item.contractEndDate,
        },
        {
          label: t('reports.colDaysToExpiry'),
          value: dayLabel(item.daysToExpiry),
        },
      ],
      status: reportStatusLabel(item.status),
    });
  };

  const exportUpcomingExcel = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      t('reports.colSupervisingOrg'),
      t('reports.colLastInvoice'),
      t('reports.colNextInvoice'),
      t('reports.colDaysRemaining'),
      `${t('reports.colAmountDue')} (${currencyLabel})`,
    ];
    const rows = upcomingData.map((item) => [
      item.serialNo,
      item.workerName,
      item.passportNo,
      item.hostCompany,
      item.supervisingOrg,
      item.lastInvoiceDate,
      item.nextInvoiceDate,
      item.daysRemaining,
      moneyNum(item.managementFee, item.currency || 'JPY'),
    ]);
    exportToExcel('Upcoming_Invoice_Report_1_Month', 'Upcoming', headers, rows, {
      title: `${t('reports.upcomingTableTitle')} — ${currencyLabel}`,
    });
  };

  const exportUpcomingPdf = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      t('reports.colSupervisingOrg'),
      t('reports.colLastInvoice'),
      t('reports.colNextInvoice'),
      t('reports.colDaysRemaining'),
      `${t('reports.colAmountDue')} (${currencyLabel})`,
    ];
    const rows = upcomingData.map((item) => [
      item.serialNo,
      item.workerName,
      item.passportNo,
      item.hostCompany,
      item.supervisingOrg,
      item.lastInvoiceDate,
      item.nextInvoiceDate,
      item.daysRemaining,
      money(item.managementFee, item.currency || 'JPY'),
    ]);
    exportToPDF(`${t('reports.upcomingTableTitle')} — ${currencyLabel}`, headers, rows, {
      filename: 'Upcoming_Invoice_Report_1_Month',
    });
  };

  const exportOutstandingExcel = () => {
    const headers = [
      t('reports.colInvoiceNo'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      `${t('reports.colTotal')} (${currencyLabel})`,
      `${t('reports.colReceived')} (${currencyLabel})`,
      `${t('reports.colOutstanding')} (${currencyLabel})`,
      t('reports.colPaymentDate'),
      t('reports.colReceiptNo'),
      t('reports.colReceiptStatus'),
    ];
    const rows = outstandingData.map((item) => [
      item.invoiceNo,
      item.workerName,
      item.passportNo,
      item.hostCompany,
      moneyNum(item.totalAmount, item.currency),
      moneyNum(item.amountReceived, item.currency),
      moneyNum(item.outstandingAmount, item.currency),
      item.paymentReceivedDate || notAvailable,
      item.receiptNo || notAvailable,
      receiptStatusLabel(item.receiptSentStatus),
    ]);
    exportToExcel('Outstanding_Balance_Report', 'Outstanding', headers, rows, {
      title: `${t('reports.outstandingTableTitle')} — ${currencyLabel}`,
    });
  };

  const exportOutstandingPdf = () => {
    const headers = [
      t('reports.colInvoiceNo'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      `${t('reports.colTotal')} (${currencyLabel})`,
      `${t('reports.colReceived')} (${currencyLabel})`,
      `${t('reports.colOutstanding')} (${currencyLabel})`,
      t('reports.colPaymentDate'),
      t('reports.colReceiptNo'),
      t('reports.colReceiptStatus'),
    ];
    const rows = outstandingData.map((item) => [
      item.invoiceNo,
      item.workerName,
      item.passportNo,
      item.hostCompany,
      money(item.totalAmount, item.currency),
      money(item.amountReceived, item.currency),
      money(item.outstandingAmount, item.currency),
      item.paymentReceivedDate || notAvailable,
      item.receiptNo || notAvailable,
      receiptStatusLabel(item.receiptSentStatus),
    ]);
    exportToPDF(`${t('reports.outstandingTableTitle')} — ${currencyLabel}`, headers, rows, {
      filename: 'Outstanding_Balance_Report',
    });
  };

  const exportExpiryExcel = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      t('reports.colVisaType'),
      t('reports.colDepartureDate'),
      t('reports.colContractEndDate'),
      t('reports.colDaysToExpiry'),
      t('reports.colStatus'),
    ];
    const rows = expiryData.map((item) => [
      item.serialNo,
      item.workerName,
      item.passportNo,
      item.hostCompany,
      item.visaType,
      item.departureDate,
      item.contractEndDate,
      item.daysToExpiry,
      reportStatusLabel(item.status),
    ]);
    exportToExcel('Contract_Expiry_Report', 'Expiry', headers, rows, {
      title: t('reports.expiryTableTitle'),
    });
  };

  const exportExpiryPdf = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      t('reports.colVisaType'),
      t('reports.colDepartureDate'),
      t('reports.colContractEndDate'),
      t('reports.colDaysToExpiry'),
      t('reports.colStatus'),
    ];
    const rows = expiryData.map((item) => [
      item.serialNo,
      item.workerName,
      item.passportNo,
      item.hostCompany,
      item.visaType,
      item.departureDate,
      item.contractEndDate,
      item.daysToExpiry,
      reportStatusLabel(item.status),
    ]);
    exportToPDF(t('reports.expiryTableTitle'), headers, rows, {
      filename: 'Contract_Expiry_Report',
    });
  };

  const exportFeesExcel = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      t('reports.colFeeType'),
      `${t('reports.colAmountDue')} (${currencyLabel})`,
      `${t('reports.colReceived')} (${currencyLabel})`,
      `${t('reports.colOutstanding')} (${currencyLabel})`,
      t('reports.colInstallments'),
      t('reports.colLastPayment'),
      t('reports.colStatus'),
    ];
    const rows = filteredFeeData.map((item) => [
      item.serialNo,
      item.workerName,
      item.passportNo,
      item.hostCompany,
      feeTypeLabel(item.feeType),
      moneyNum(item.totalDue, item.currency),
      moneyNum(item.amountReceived, item.currency),
      moneyNum(item.outstandingAmount, item.currency),
      item.paymentCount,
      item.lastPaymentDate || notAvailable,
      reportStatusLabel(item.status),
    ]);
    exportToExcel('Flight_Training_Fee_Report', 'FeePayments', headers, rows, {
      title: `${t('reports.feesTableTitle')} — ${currencyLabel}`,
    });
  };

  const exportFeesPdf = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorker'),
      t('reports.colFeeType'),
      `${t('reports.colAmountDue')} (${currencyLabel})`,
      `${t('reports.colReceived')} (${currencyLabel})`,
      `${t('reports.colOutstanding')} (${currencyLabel})`,
      t('reports.colStatus'),
    ];
    const rows = filteredFeeData.map((item) => [
      item.serialNo,
      item.workerName,
      feeTypeLabel(item.feeType),
      money(item.totalDue, item.currency),
      money(item.amountReceived, item.currency),
      money(item.outstandingAmount, item.currency),
      reportStatusLabel(item.status),
    ]);
    exportToPDF(`${t('reports.feesTableTitle')} — ${currencyLabel}`, headers, rows, {
      filename: 'Flight_Training_Fee_Report',
    });
  };

  const exportStudentFeesExcel = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('reports.colHostCompany'),
      t('reports.colFeeType'),
      `${t('reports.colAmountDue')} (${currencyLabel})`,
      `${t('reports.colReceived')} (${currencyLabel})`,
      `${t('reports.colOutstanding')} (${currencyLabel})`,
      t('reports.colInstallments'),
      t('reports.colLastPayment'),
      t('reports.colStatus'),
    ];
    const rows = filteredStudentFeeData.map((item) => [
      item.serialNo,
      item.studentName,
      item.passportNo,
      item.hostCompany,
      feeTypeLabel(item.feeType),
      moneyNum(item.totalDue, item.currency),
      moneyNum(item.amountReceived, item.currency),
      moneyNum(item.outstandingAmount, item.currency),
      item.paymentCount,
      item.lastPaymentDate || notAvailable,
      reportStatusLabel(item.status),
    ]);
    exportToExcel('Student_Introduction_Fee_Report', 'StudentFees', headers, rows, {
      title: `${t('reports.studentsTitle')} — ${currencyLabel}`,
    });
  };

  const exportStudentFeesPdf = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorker'),
      t('reports.colFeeType'),
      `${t('reports.colAmountDue')} (${currencyLabel})`,
      `${t('reports.colReceived')} (${currencyLabel})`,
      `${t('reports.colOutstanding')} (${currencyLabel})`,
      t('reports.colStatus'),
    ];
    const rows = filteredStudentFeeData.map((item) => [
      item.serialNo,
      item.studentName,
      feeTypeLabel(item.feeType),
      money(item.totalDue, item.currency),
      money(item.amountReceived, item.currency),
      money(item.outstandingAmount, item.currency),
      reportStatusLabel(item.status),
    ]);
    exportToPDF(`${t('reports.studentsTitle')} — ${currencyLabel}`, headers, rows, {
      filename: 'Student_Introduction_Fee_Report',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bento-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>
              {reportTab === 'fees'
                ? t('reports.tabFees')
                : reportTab === 'students'
                  ? t('reports.tabStudents')
                : reportTab === 'upcoming'
                  ? t('reports.tabUpcoming')
                  : reportTab === 'outstanding'
                    ? t('reports.tabOutstanding')
                    : t('reports.tabExpiry')}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">{t('reports.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            onExcel={() => {
              if (reportTab === 'upcoming') exportUpcomingExcel();
              else if (reportTab === 'outstanding') exportOutstandingExcel();
              else if (reportTab === 'students') exportStudentFeesExcel();
              else if (reportTab === 'fees') exportFeesExcel();
              else exportExpiryExcel();
            }}
            onPdf={() => {
              if (reportTab === 'upcoming') exportUpcomingPdf();
              else if (reportTab === 'outstanding') exportOutstandingPdf();
              else if (reportTab === 'students') exportStudentFeesPdf();
              else if (reportTab === 'fees') exportFeesPdf();
              else exportExpiryPdf();
            }}
          />
          <button
            onClick={fetchReports}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            {t('reports.refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          {t('reports.loading')}
        </div>
      ) : (
        <div>
          {reportTab === 'upcoming' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bento-card p-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('reports.upcomingTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('reports.upcomingDesc')}
                  </p>
                </div>
              </div>

              <div className="bento-card overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {t('reports.upcomingTableTitle')} ({t('reports.records', { count: upcomingData.length })})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {t('reports.date')}: {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {upPaged.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">
                      {t('reports.upcomingEmpty')}
                    </p>
                  ) : (
                    upPaged.map((item, idx) => (
                      <div key={idx} className="mobile-list-row">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-bold text-slate-900">
                            {item.workerName}
                          </p>
                          <span
                            className={`status-badge shrink-0 ${
                              item.daysRemaining <= 7
                                ? 'bg-red-100 text-red-700'
                                : item.daysRemaining <= 14
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {dayLabel(item.daysRemaining)}
                          </span>
                        </div>

                        <MobileMeta
                          items={[
                            { label: t('reports.colSerial'), value: item.serialNo },
                            { label: t('reports.colPassport'), value: item.passportNo },
                            { label: t('reports.colHost'), value: item.hostCompany },
                            { label: t('reports.colSupervisingOrg'), value: item.supervisingOrg },
                            { label: t('reports.colLastInvoice'), value: item.lastInvoiceDate },
                            { label: t('reports.colNextInvoice'), value: item.nextInvoiceDate },
                            { label: t('reports.colDaysRemaining'), value: dayLabel(item.daysRemaining) },
                            {
                              label: t('reports.colAmountDue'),
                              value: money(item.managementFee, item.currency || 'JPY'),
                            },
                          ]}
                        />

                        <div className="mobile-list-actions">
                          <div className="action-group">
                            <button
                              type="button"
                              onClick={() => openUpcomingVoucher(item)}
                              className="action-btn action-btn-blue"
                              title={t('reports.print')}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="data-table-wrap hidden md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('reports.colWorkerSerial')}</th>
                        <th>{t('reports.colPassport')}</th>
                        <th>{t('reports.colHostCompany')}</th>
                        <th>{t('reports.colSupervisingOrg')}</th>
                        <th>{t('reports.colLastInvoice')}</th>
                        <th>{t('reports.colNextInvoice')}</th>
                        <th className="text-center">{t('reports.colDaysRemaining')}</th>
                        <th className="text-right">
                          {t('reports.colAmountDue')} ({currencyLabel})
                        </th>
                        <th className="text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {upPaged.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="empty-cell">
                            {t('reports.upcomingEmpty')}
                          </td>
                        </tr>
                      ) : (
                        upPaged.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="cell-stack">
                                <span className="cell-primary">{item.workerName}</span>
                                <span className="cell-id">{item.serialNo}</span>
                              </div>
                            </td>
                            <td>
                              <span className="cell-mono">{item.passportNo}</span>
                            </td>
                            <td>
                              <span className="cell-primary">{item.hostCompany}</span>
                            </td>
                            <td>
                              <span className="cell-secondary">{item.supervisingOrg}</span>
                            </td>
                            <td>
                              <span className="cell-secondary font-mono">
                                {item.lastInvoiceDate}
                              </span>
                            </td>
                            <td>
                              <span className="cell-mono">{item.nextInvoiceDate}</span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`status-badge inline-block ${
                                  item.daysRemaining <= 7
                                    ? 'bg-red-100 text-red-700'
                                    : item.daysRemaining <= 14
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {dayLabel(item.daysRemaining)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono font-semibold">
                                {money(item.managementFee, item.currency || 'JPY')}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => openUpcomingVoucher(item)}
                                className="action-btn action-btn-blue"
                                title={t('reports.print')}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={upPage}
                  pageSize={upPageSize}
                  total={upTotal}
                  totalPages={upTotalPages}
                  from={upFrom}
                  to={upTo}
                  onPageChange={setUpPage}
                  onPageSizeChange={setUpPageSize}
                />
              </div>
            </div>
          )}

          {reportTab === 'outstanding' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bento-card p-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('reports.outstandingTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('reports.outstandingDesc')}
                  </p>
                </div>
              </div>

              <div className="bento-card overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {t('reports.outstandingTableTitle')} ({t('reports.records', { count: outstandingData.length })})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {t('reports.date')}: {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {outPaged.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">
                      {t('reports.outstandingEmpty')}
                    </p>
                  ) : (
                    outPaged.map((item, idx) => (
                      <div key={idx} className="mobile-list-row">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold text-slate-900">
                              {item.invoiceNo}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                              {item.workerName}
                            </p>
                          </div>
                          <span
                            className={`status-badge shrink-0 ${
                              item.receiptSentStatus === 'Receipt Sent'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {receiptStatusLabel(item.receiptSentStatus)}
                          </span>
                        </div>

                        <MobileMeta
                          items={[
                            { label: t('reports.colPassport'), value: item.passportNo },
                            { label: t('reports.colHost'), value: item.hostCompany },
                            {
                              label: t('reports.colTotal'),
                              value: money(item.totalAmount, item.currency),
                            },
                            {
                              label: t('reports.colReceived'),
                              value: money(item.amountReceived, item.currency),
                            },
                            {
                              label: t('reports.colOutstanding'),
                              value: money(item.outstandingAmount, item.currency),
                            },
                            { label: t('reports.colReceiptNo'), value: item.receiptNo || notAvailable },
                            {
                              label: t('reports.colPaymentDate'),
                              value: item.paymentReceivedDate || notAvailable,
                            },
                            {
                              label: t('reports.colReceiptStatus'),
                              value: receiptStatusLabel(item.receiptSentStatus),
                            },
                            {
                              label: t('reports.colFeeType'),
                              value: feeTypeLabel(item.feeType || 'management'),
                            },
                          ]}
                        />

                        <div className="mobile-list-actions">
                          <div className="action-group">
                            <button
                              type="button"
                              onClick={() => openOutstandingVoucher(item)}
                              className="action-btn action-btn-blue"
                              title={t('reports.print')}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="data-table-wrap hidden md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('reports.colInvoiceNo')}</th>
                        <th>{t('reports.colWorker')}</th>
                        <th>{t('reports.colHostCompany')}</th>
                        <th className="text-right">{t('reports.colTotal')}</th>
                        <th className="text-right">{t('reports.colReceived')}</th>
                        <th className="text-right">{t('reports.colOutstanding')}</th>
                        <th>{t('reports.colReceiptPayment')}</th>
                        <th className="text-center">{t('reports.colReceiptStatus')}</th>
                        <th className="text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {outPaged.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="empty-cell">
                            {t('reports.outstandingEmpty')}
                          </td>
                        </tr>
                      ) : (
                        outPaged.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className="cell-id">{item.invoiceNo}</span>
                            </td>
                            <td>
                              <div className="cell-stack">
                                <span className="cell-primary">{item.workerName}</span>
                                <span className="cell-secondary font-mono">
                                  {item.passportNo}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="cell-primary">{item.hostCompany}</span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono">
                                {money(item.totalAmount, item.currency)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono text-emerald-600">
                                {money(item.amountReceived, item.currency)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono text-slate-900">
                                {money(item.outstandingAmount, item.currency)}
                              </span>
                            </td>
                            <td>
                              <div className="cell-stack">
                                <span className="cell-id">{item.receiptNo || notAvailable}</span>
                                <span className="cell-secondary">
                                  {item.paymentReceivedDate || notAvailable}
                                </span>
                              </div>
                            </td>
                            <td className="text-center">
                              <span
                                className={`status-badge inline-block ${
                                  item.receiptSentStatus === 'Receipt Sent'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {receiptStatusLabel(item.receiptSentStatus)}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => openOutstandingVoucher(item)}
                                className="action-btn action-btn-blue"
                                title={t('reports.print')}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={outPage}
                  pageSize={outPageSize}
                  total={outTotal}
                  totalPages={outTotalPages}
                  from={outFrom}
                  to={outTo}
                  onPageChange={setOutPage}
                  onPageSizeChange={setOutPageSize}
                />
              </div>
            </div>
          )}

          {reportTab === 'fees' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bento-card p-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('reports.feesTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('reports.feesDesc')}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <MobileFilterToggle
                    open={filtersOpen}
                    onToggle={() => setFiltersOpen((v) => !v)}
                    activeCount={activeFilterCount}
                  />
                  <div
                    className={`${filtersOpen ? 'flex flex-wrap' : 'hidden'} items-center gap-2 md:flex`}
                  >
                    <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-56">
                      <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={feeSearch}
                        onChange={(e) => setFeeSearch(e.target.value)}
                        placeholder={t('reports.feeSearch')}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span>{t('reports.dateFrom')}</span>
                      <input
                        type="date"
                        value={feeDateFrom}
                        onChange={(e) => setFeeDateFrom(e.target.value)}
                        className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold bg-white text-slate-800"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span>{t('reports.dateTo')}</span>
                      <input
                        type="date"
                        value={feeDateTo}
                        onChange={(e) => setFeeDateTo(e.target.value)}
                        className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold bg-white text-slate-800"
                      />
                    </label>
                    {(feeDateFrom || feeDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeeDateFrom('');
                          setFeeDateTo('');
                        }}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        {t('reports.clearDates')}
                      </button>
                    )}
                    <select
                      value={feeFilter}
                      onChange={(e) => setFeeFilter(e.target.value as 'all' | 'outstanding')}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
                    >
                      <option value="outstanding">{t('reports.feeFilterOutstanding')}</option>
                      <option value="all">{t('reports.feeFilterAll')}</option>
                    </select>
                    <select
                      value={feeTypeFilter}
                      onChange={(e) =>
                        setFeeTypeFilter(e.target.value as 'all' | FeeType)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
                    >
                      <option value="all">{t('reports.feeTypeAll')}</option>
                      <option value="management">{t('workerModal.managementFee')}</option>
                      <option value="flight">{t('workerModal.flightFee')}</option>
                      <option value="training">{t('workerModal.trainingFee')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {feeSummary.map((s) => {
                  const Icon =
                    s.feeType === 'flight'
                      ? Plane
                      : s.feeType === 'training'
                        ? GraduationCap
                        : Briefcase;
                  const active = feeTypeFilter === s.feeType;
                  return (
                    <button
                      key={s.feeType}
                      type="button"
                      onClick={() =>
                        setFeeTypeFilter((prev) => (prev === s.feeType ? 'all' : s.feeType))
                      }
                      className={`bento-card cursor-pointer p-4 text-left transition ring-offset-2 ${
                        active ? 'ring-2 ring-blue-600' : 'hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Icon className="h-3.5 w-3.5 text-blue-600" />
                          {feeTypeLabel(s.feeType)}
                        </span>
                        <span className={feeTypePillClass(s.feeType)}>
                          {t('reports.records', { count: s.count })}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">
                        {t('reports.colOutstanding')}
                      </p>
                      <p className="font-mono text-sm font-bold text-amber-700">
                        {money(s.outstanding, 'JPY')}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                        <span>
                          {t('reports.voucherDue')}: {money(s.due, 'JPY')}
                        </span>
                        <span className="text-emerald-600">
                          {t('reports.colReceived')}: {money(s.received, 'JPY')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bento-card overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {t('reports.feesTableTitle')} ({t('reports.records', { count: filteredFeeData.length })})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {t('reports.date')}: {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {feePaged.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">
                      {t('reports.feesEmpty')}
                    </p>
                  ) : (
                    feePaged.map((item, idx) => (
                      <div key={`${item.workerId}-${item.feeType}-${idx}`} className="mobile-list-row">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-bold text-slate-900">
                            {item.workerName}
                          </p>
                          <span
                            className={`status-badge shrink-0 ${
                              item.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {reportStatusLabel(item.status)}
                          </span>
                        </div>

                        <MobileMeta
                          items={[
                            { label: t('reports.colSerial'), value: item.serialNo },
                            { label: t('reports.colPassport'), value: item.passportNo },
                            { label: t('reports.colHost'), value: item.hostCompany },
                            { label: t('reports.colFeeType'), value: feeTypeLabel(item.feeType) },
                            {
                              label: t('reports.voucherDue'),
                              value: money(item.totalDue, item.currency),
                            },
                            {
                              label: t('reports.colReceived'),
                              value: money(item.amountReceived, item.currency),
                            },
                            {
                              label: t('reports.colOutstanding'),
                              value: money(item.outstandingAmount, item.currency),
                            },
                            { label: t('reports.colInstallments'), value: String(item.paymentCount) },
                            { label: t('reports.colLastPayment'), value: item.lastPaymentDate || notAvailable },
                            { label: t('reports.colStatus'), value: reportStatusLabel(item.status) },
                          ]}
                        />

                        <div className="mobile-list-actions">
                          <div className="action-group">
                            <button
                              type="button"
                              onClick={() => openFeesVoucher(item)}
                              className="action-btn action-btn-blue"
                              title={t('reports.print')}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="data-table-wrap hidden md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('reports.colWorkerSerial')}</th>
                        <th>{t('reports.colPassport')}</th>
                        <th>{t('reports.colHostCompany')}</th>
                        <th>{t('reports.colFeeType')}</th>
                        <th className="text-right">{t('reports.colAmountDue')}</th>
                        <th className="text-right">{t('reports.colReceived')}</th>
                        <th className="text-right">{t('reports.colOutstanding')}</th>
                        <th className="text-center">{t('reports.colInstallments')}</th>
                        <th>{t('reports.colLastPayment')}</th>
                        <th className="text-center">{t('reports.colStatus')}</th>
                        <th className="text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {feePaged.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="empty-cell">
                            {t('reports.feesEmpty')}
                          </td>
                        </tr>
                      ) : (
                        feePaged.map((item, idx) => (
                          <tr key={`${item.workerId}-${item.feeType}-${idx}`}>
                            <td>
                              <div className="cell-stack">
                                <span className="cell-primary">{item.workerName}</span>
                                <span className="cell-id">{item.serialNo}</span>
                              </div>
                            </td>
                            <td>
                              <span className="cell-mono">{item.passportNo}</span>
                            </td>
                            <td>
                              <span className="cell-primary">{item.hostCompany}</span>
                            </td>
                            <td>
                              <span className={feeTypePillClass(item.feeType)}>
                                {feeTypeLabel(item.feeType)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono">
                                {money(item.totalDue, item.currency)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono text-emerald-600">
                                {money(item.amountReceived, item.currency)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono font-semibold text-amber-700">
                                {money(item.outstandingAmount, item.currency)}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="cell-mono">{item.paymentCount}</span>
                            </td>
                            <td>
                              <span className="cell-secondary font-mono">
                                {item.lastPaymentDate || notAvailable}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`status-badge inline-block ${
                                  item.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : item.status === 'Partial'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {reportStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => openFeesVoucher(item)}
                                className="action-btn action-btn-blue"
                                title={t('reports.print')}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={feePage}
                  pageSize={feePageSize}
                  total={feeTotal}
                  totalPages={feeTotalPages}
                  from={feeFrom}
                  to={feeTo}
                  onPageChange={setFeePage}
                  onPageSizeChange={setFeePageSize}
                />
              </div>
            </div>
          )}

          {reportTab === 'students' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bento-card p-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('reports.studentsTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('reports.studentsDesc')}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <MobileFilterToggle
                    open={filtersOpen}
                    onToggle={() => setFiltersOpen((v) => !v)}
                    activeCount={studentActiveFilterCount}
                  />
                  <div
                    className={`${filtersOpen ? 'flex flex-wrap' : 'hidden'} items-center gap-2 md:flex`}
                  >
                    <div className="relative min-w-[200px] flex-1 sm:flex-none sm:w-56">
                      <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={studentFeeSearch}
                        onChange={(e) => setStudentFeeSearch(e.target.value)}
                        placeholder={t('reports.studentsSearch')}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span>{t('reports.dateFrom')}</span>
                      <input
                        type="date"
                        value={studentFeeDateFrom}
                        onChange={(e) => setStudentFeeDateFrom(e.target.value)}
                        className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold bg-white text-slate-800"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span>{t('reports.dateTo')}</span>
                      <input
                        type="date"
                        value={studentFeeDateTo}
                        onChange={(e) => setStudentFeeDateTo(e.target.value)}
                        className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold bg-white text-slate-800"
                      />
                    </label>
                    {(studentFeeDateFrom || studentFeeDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentFeeDateFrom('');
                          setStudentFeeDateTo('');
                        }}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        {t('reports.clearDates')}
                      </button>
                    )}
                    <select
                      value={studentFeeFilter}
                      onChange={(e) =>
                        setStudentFeeFilter(e.target.value as 'all' | 'outstanding')
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
                    >
                      <option value="outstanding">{t('reports.feeFilterOutstanding')}</option>
                      <option value="all">{t('reports.feeFilterAll')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bento-card overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {t('reports.studentsTitle')} ({t('reports.records', { count: filteredStudentFeeData.length })})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {t('reports.date')}: {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {studentFeePaged.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">
                      {t('reports.studentsEmpty')}
                    </p>
                  ) : (
                    studentFeePaged.map((item, idx) => (
                      <div key={`${item.studentId}-${idx}`} className="mobile-list-row">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-bold text-slate-900">
                            {item.studentName}
                          </p>
                          <span
                            className={`status-badge shrink-0 ${
                              item.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {reportStatusLabel(item.status)}
                          </span>
                        </div>

                        <MobileMeta
                          items={[
                            { label: t('reports.colSerial'), value: item.serialNo },
                            { label: t('reports.colPassport'), value: item.passportNo },
                            { label: t('reports.colHost'), value: item.hostCompany },
                            { label: t('reports.colFeeType'), value: feeTypeLabel(item.feeType) },
                            {
                              label: t('reports.voucherDue'),
                              value: money(item.totalDue, item.currency),
                            },
                            {
                              label: t('reports.colReceived'),
                              value: money(item.amountReceived, item.currency),
                            },
                            {
                              label: t('reports.colOutstanding'),
                              value: money(item.outstandingAmount, item.currency),
                            },
                            { label: t('reports.colInstallments'), value: String(item.paymentCount) },
                            { label: t('reports.colLastPayment'), value: item.lastPaymentDate || notAvailable },
                            { label: t('reports.colStatus'), value: reportStatusLabel(item.status) },
                          ]}
                        />

                        <div className="mobile-list-actions">
                          <div className="action-group">
                            <button
                              type="button"
                              onClick={() => openStudentFeesVoucher(item)}
                              className="action-btn action-btn-blue"
                              title={t('reports.print')}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="data-table-wrap hidden md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('reports.colWorkerSerial')}</th>
                        <th>{t('reports.colPassport')}</th>
                        <th>{t('reports.colHostCompany')}</th>
                        <th>{t('reports.colFeeType')}</th>
                        <th className="text-right">{t('reports.colAmountDue')}</th>
                        <th className="text-right">{t('reports.colReceived')}</th>
                        <th className="text-right">{t('reports.colOutstanding')}</th>
                        <th className="text-center">{t('reports.colInstallments')}</th>
                        <th>{t('reports.colLastPayment')}</th>
                        <th className="text-center">{t('reports.colStatus')}</th>
                        <th className="text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentFeePaged.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="empty-cell">
                            {t('reports.studentsEmpty')}
                          </td>
                        </tr>
                      ) : (
                        studentFeePaged.map((item, idx) => (
                          <tr key={`${item.studentId}-${idx}`}>
                            <td>
                              <div className="cell-stack">
                                <span className="cell-primary">{item.studentName}</span>
                                <span className="cell-id">{item.serialNo}</span>
                              </div>
                            </td>
                            <td>
                              <span className="cell-mono">{item.passportNo}</span>
                            </td>
                            <td>
                              <span className="cell-primary">{item.hostCompany}</span>
                            </td>
                            <td>
                              <span className={feeTypePillClass(item.feeType)}>
                                {feeTypeLabel(item.feeType)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono">{money(item.totalDue, item.currency)}</span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono text-emerald-600">
                                {money(item.amountReceived, item.currency)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="cell-mono font-semibold text-amber-700">
                                {money(item.outstandingAmount, item.currency)}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="cell-mono">{item.paymentCount}</span>
                            </td>
                            <td>
                              <span className="cell-secondary font-mono">
                                {item.lastPaymentDate || notAvailable}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`status-badge inline-block ${
                                  item.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : item.status === 'Partial'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {reportStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => openStudentFeesVoucher(item)}
                                className="action-btn action-btn-blue"
                                title={t('reports.print')}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={studentFeePage}
                  pageSize={studentFeePageSize}
                  total={studentFeeTotal}
                  totalPages={studentFeeTotalPages}
                  from={studentFeeFrom}
                  to={studentFeeTo}
                  onPageChange={setStudentFeePage}
                  onPageSizeChange={setStudentFeePageSize}
                />
              </div>
            </div>
          )}

          {reportTab === 'expiry' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bento-card p-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('reports.expiryTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('reports.expiryDesc')}
                  </p>
                </div>
              </div>

              <div className="bento-card overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {t('reports.expiryTableTitle')} ({t('reports.records', { count: expiryData.length })})
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {t('reports.date')}: {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {expPaged.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">
                      {t('reports.expiryEmpty')}
                    </p>
                  ) : (
                    expPaged.map((item, idx) => (
                      <div key={idx} className="mobile-list-row">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-bold text-slate-900">
                            {item.workerName}
                          </p>
                          <span
                            className={`status-badge shrink-0 ${
                              item.daysToExpiry <= 30
                                ? 'bg-red-100 text-red-700'
                                : item.daysToExpiry <= 90
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {dayLabel(item.daysToExpiry)}
                          </span>
                        </div>

                        <MobileMeta
                          items={[
                            { label: t('reports.colSerial'), value: item.serialNo },
                            { label: t('reports.colPassport'), value: item.passportNo },
                            { label: t('reports.colVisaType'), value: item.visaType },
                            { label: t('reports.colHost'), value: item.hostCompany },
                            { label: t('reports.colDepartureDate'), value: item.departureDate },
                            { label: t('reports.colContractEndDate'), value: item.contractEndDate },
                            { label: t('reports.colDaysToExpiry'), value: dayLabel(item.daysToExpiry) },
                            { label: t('reports.colStatus'), value: reportStatusLabel(item.status) },
                          ]}
                        />

                        <div className="mobile-list-actions">
                          <div className="action-group">
                            <button
                              type="button"
                              onClick={() => openExpiryVoucher(item)}
                              className="action-btn action-btn-blue"
                              title={t('reports.print')}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="data-table-wrap hidden md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('reports.colWorkerSerial')}</th>
                        <th>{t('reports.colPassport')}</th>
                        <th>{t('reports.colVisaType')}</th>
                        <th>{t('reports.colHostCompany')}</th>
                        <th>{t('reports.colDepartureDate')}</th>
                        <th>{t('reports.colContractEndDate')}</th>
                        <th className="text-center">{t('reports.colDaysToExpiry')}</th>
                        <th className="text-center">{t('reports.colStatus')}</th>
                        <th className="text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expPaged.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="empty-cell">
                            {t('reports.expiryEmpty')}
                          </td>
                        </tr>
                      ) : (
                        expPaged.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="cell-stack">
                                <span className="cell-primary">{item.workerName}</span>
                                <span className="cell-id">{item.serialNo}</span>
                              </div>
                            </td>
                            <td>
                              <span className="cell-mono">{item.passportNo}</span>
                            </td>
                            <td>
                              <span className="pill pill-blue">{item.visaType}</span>
                            </td>
                            <td>
                              <span className="cell-primary">{item.hostCompany}</span>
                            </td>
                            <td>
                              <span className="cell-secondary font-mono">
                                {item.departureDate}
                              </span>
                            </td>
                            <td>
                              <span className="cell-mono">{item.contractEndDate}</span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`status-badge inline-block ${
                                  item.daysToExpiry <= 30
                                    ? 'bg-red-100 text-red-700'
                                    : item.daysToExpiry <= 90
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {dayLabel(item.daysToExpiry)}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`status-badge inline-block ${
                                  item.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {reportStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                onClick={() => openExpiryVoucher(item)}
                                className="action-btn action-btn-blue"
                                title={t('reports.print')}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={expPage}
                  pageSize={expPageSize}
                  total={expTotal}
                  totalPages={expTotalPages}
                  from={expFrom}
                  to={expTo}
                  onPageChange={setExpPage}
                  onPageSizeChange={setExpPageSize}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {voucher && (
        <ReportVoucherModal voucher={voucher} onClose={() => setVoucher(null)} />
      )}
    </div>
  );
};
