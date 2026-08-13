import type { UserPermissions } from './utils/permissions';

export type WorkerStatus = 'Active' | 'Contract Ended' | 'Absconded';

export type VisaType = 
  | 'TITP-1' 
  | 'TITP-2' 
  | 'TITP-3' 
  | 'SSW-Caregiver' 
  | 'SSW-Construction' 
  | 'SSW-Food Processing' 
  | 'SSW-Agriculture' 
  | 'SSW-Manufacturing' 
  | 'Engineering/Humanities'
  | 'Other';

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  permissions: UserPermissions;
  avatarUrl?: string;
}

export interface DeploymentInfo {
  visaType: string; // from Settings system variables (dropdown)
  supervisingOrg: string; // School Name (students) / Supervising Org (workers)
  hostCompany: string;    // School Address (students) / Host Company (workers)
  jobCategory: string;    // workers only; unused for students
  ownCardDate: string;    // workers only; unused for students
  departureDate: string;  // ထွက်ခွာသည့်နေ့
  japanEntryDate: string; // Japan ဝင်သည့်နေ့
  contractEndDate: string;// workers only; unused for students
}

export interface FinancialConfig {
  flightFee: number;       // လေယာဉ်စရိတ် (MMK/JPY)
  trainingFee: number;     // သင်တန်းကြေး
  managementFee: number;   // စီမံခန့်ခွဲမှုကြေး
  billingCycleMonths: number; // e.g. 6 months
  /** Source currency for fee amounts (set on worker; invoices inherit this). */
  currency: 'JPY' | 'MMK' | 'USD';
}

export interface Worker {
  id: string;
  serialNo: string;        // စဉ် (e.g., "W-2024-001")
  name: string;            // အမည်
  gender: 'Male' | 'Female';// ကျား/မ
  dob: string;             // မွေးသက္ကရာဇ် (YYYY-MM-DD)
  passportNo: string;      // Passport နံပါတ်
  status: WorkerStatus;    // Active, Contract Ended, Absconded
  abscondedDate?: string;  // ထွက်ပြေးသည့်ရက်စွဲ (if absconded)
  notes?: string;          // မှတ်ချက်
  deployment: DeploymentInfo;
  financialConfig: FinancialConfig;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFinancialConfig {
  introductionFee: number;
}

export interface Student {
  id: string;
  serialNo: string;
  name: string;
  gender: 'Male' | 'Female';
  dob: string;
  passportNo: string;
  status: WorkerStatus;
  abscondedDate?: string;
  notes?: string;
  deployment: DeploymentInfo;
  financialConfig: StudentFinancialConfig;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue';

export type InvoiceFeeType = 'management' | 'flight' | 'training' | 'introduction';

export type FeeType = 'flight' | 'training' | 'management';
export type FeePaymentStatus = 'Pending' | 'Partial' | 'Paid';

export interface FeePayment {
  id: string;
  workerId: string;
  workerName?: string;
  feeType: FeeType;
  amount: number;
  paymentDate: string;
  receiptNo?: string;
  notes?: string;
  currency: 'JPY' | 'MMK' | 'USD';
  createdAt: string;
}

export interface FeePaymentSummary {
  workerId: string;
  serialNo: string;
  workerName: string;
  passportNo: string;
  hostCompany: string;
  feeType: FeeType;
  totalDue: number;
  amountReceived: number;
  outstandingAmount: number;
  status: FeePaymentStatus;
  paymentCount: number;
  lastPaymentDate?: string;
  currency: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  workerId: string;
  workerName: string;
  serialNo?: string;
  passportNo?: string;
  amount: number;
}

export interface BankAccount {
  id: string;
  label: string;
  bankName: string;
  branchCode?: string;
  branchName?: string;
  accountNumber: string;
  accountHolder: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface Invoice {
  id: string;
  invoiceNo: string;          // Invoice No (e.g. "INV-2026-001")
  workerId?: string;          // Legacy optional
  workerName: string;         // Often host company for host invoices
  passportNo: string;
  hostCompany: string;
  supervisingOrg: string;
  feeType: InvoiceFeeType;    // management | flight | training
  billingPeriod: string;      // e.g. "2026 H1 (Jan - Jun)"
  lastInvoiceDate: string;    // နောက်ဆုံး Invoice ထုတ်သည့်နေ့
  nextInvoiceDate: string;    // နောက်တစ်ကြိမ် Invoice ထုတ်ရမည့်နေ့
  totalAmount: number;        // Subtotal excl. tax
  taxAmount?: number;
  amountDue?: number;         // totalAmount + tax — payments apply against this
  amountReceived: number;     // လက်ခံရရှိသော ငွေပမာဏ
  outstandingAmount: number;  // ကျန်ရှိသေးသော ငွေပမာဏ (Due - Received)
  paymentReceivedDate?: string; // ငွေဝင်သည့်နေ့
  receiptNo?: string;         // Receipt No
  receiptSentDate?: string;   // Receipt ပို့သည့်နေ့
  status: InvoiceStatus;
  currency: 'JPY' | 'MMK' | 'USD';
  notes?: string;
  billedToAttn?: string;
  subject?: string;
  taxRate?: number;
  bankAccountId?: string;
  bankName?: string;
  branchCode?: string;
  branchName?: string;
  accountNumber?: string;
  accountHolder?: string;
  createdAt: string;
  lines?: InvoiceLine[];
  workerCount?: number;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  invoiceNo?: string;
  workerId?: string;
  workerName?: string;
  feeType?: InvoiceFeeType;
  amount: number;
  paymentDate: string;
  receiptNo?: string;
  notes?: string;
  currency: 'JPY' | 'MMK' | 'USD';
  createdAt: string;
}

export interface InvoiceWorkerSummary {
  hostCompany: string;
  supervisingOrg: string;
  workerCount: number;
  feeType: InvoiceFeeType;
  totalAmount: number;
  totalPaid: number;
  remainAmount: number;
  invoiceCount: number;
  paymentCount: number;
  /** Latest payment received date across invoices (when fully paid / any payment). */
  lastPaymentDate?: string;
  /** @deprecated legacy per-worker fields */
  workerId?: string;
  workerName?: string;
  passportNo?: string;
  serialNo?: string;
}

export interface StudentInvoiceLine {
  id: string;
  invoiceId: string;
  studentId: string;
  studentName: string;
  serialNo?: string;
  passportNo?: string;
  amount: number;
}

export interface StudentInvoice {
  id: string;
  invoiceNo: string;
  /** School Name — primary billable entity */
  schoolName: string;
  /** Legacy optional link */
  studentId?: string;
  studentName: string;
  passportNo: string;
  hostCompany: string;
  supervisingOrg: string;
  feeType: 'introduction';
  billingPeriod: string;
  lastInvoiceDate: string;
  nextInvoiceDate: string;
  totalAmount: number;
  taxAmount?: number;
  amountDue?: number;
  amountReceived: number;
  outstandingAmount: number;
  paymentReceivedDate?: string;
  receiptNo?: string;
  receiptSentDate?: string;
  status: InvoiceStatus;
  currency: 'JPY' | 'MMK' | 'USD';
  notes?: string;
  billedToAttn?: string;
  subject?: string;
  taxRate?: number;
  bankAccountId?: string;
  bankName?: string;
  branchCode?: string;
  branchName?: string;
  accountNumber?: string;
  accountHolder?: string;
  createdAt: string;
  lines?: StudentInvoiceLine[];
  studentCount?: number;
}

export interface StudentInvoicePayment {
  id: string;
  invoiceId: string;
  invoiceNo?: string;
  studentId?: string;
  studentName?: string;
  feeType?: 'introduction';
  amount: number;
  paymentDate: string;
  receiptNo?: string;
  notes?: string;
  currency: 'JPY' | 'MMK' | 'USD';
  createdAt: string;
}

export interface StudentFeePaymentSummary {
  studentId: string;
  serialNo: string;
  studentName: string;
  passportNo: string;
  hostCompany: string;
  feeType: 'introduction';
  totalDue: number;
  amountReceived: number;
  outstandingAmount: number;
  status: FeePaymentStatus;
  paymentCount: number;
  lastPaymentDate?: string;
  currency: string;
}

export interface StudentInvoiceSchoolSummary {
  schoolName: string;
  studentCount: number;
  feeType: 'introduction';
  totalAmount: number;
  totalPaid: number;
  remainAmount: number;
  invoiceCount: number;
  paymentCount: number;
  /** Latest payment received date across school invoices. */
  lastPaymentDate?: string;
}

/** @deprecated Use StudentInvoiceSchoolSummary */
export type StudentInvoiceWorkerSummary = StudentInvoiceSchoolSummary;

export type StudentInvoiceSummary = StudentInvoiceSchoolSummary;

export interface DashboardStats {
  totalWorkers: number;
  activeWorkers: number;
  contractEndedWorkers: number;
  abscondedWorkers: number;
  abscondingRate: number; // percentage
  totalInvoicesCount: number;
  pendingInvoicesCount: number;
  upcomingInvoicesCount7Days: number;
  contractExpiring30DaysCount: number;
  totalOutstandingAmountJPY: number;
  totalCollectedAmountJPY: number;
  unsentReceiptsCount: number;
}

export interface UpcomingInvoiceReportItem {
  workerId: string;
  serialNo: string;
  workerName: string;
  passportNo: string;
  hostCompany: string;
  supervisingOrg: string;
  lastInvoiceDate: string;
  nextInvoiceDate: string;
  daysRemaining: number;
  managementFee: number;
  currency: string;
}

export interface OutstandingBalanceReportItem {
  invoiceId: string;
  invoiceNo: string;
  feeType?: string;
  workerName: string;
  passportNo: string;
  hostCompany: string;
  totalAmount: number;
  amountReceived: number;
  outstandingAmount: number;
  paymentReceivedDate?: string;
  receiptNo?: string;
  receiptSentDate?: string;
  receiptSentStatus: 'Receipt Sent' | 'Receipt Pending';
  currency: string;
}

export interface ContractExpiryReportItem {
  workerId: string;
  serialNo: string;
  workerName: string;
  passportNo: string;
  hostCompany: string;
  visaType: string;
  departureDate: string;
  contractEndDate: string;
  daysToExpiry: number;
  status: WorkerStatus;
}
