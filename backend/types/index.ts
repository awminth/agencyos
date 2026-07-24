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

export interface DeploymentInfo {
  visaType: string;
  supervisingOrg: string;
  hostCompany: string;
  jobCategory: string;
  ownCardDate: string;
  departureDate: string;
  japanEntryDate: string;
  contractEndDate: string;
}

export interface FinancialConfig {
  flightFee: number;
  trainingFee: number;
  managementFee: number;
  billingCycleMonths: number;
  currency: 'JPY' | 'MMK' | 'USD';
}

export interface StudentFinancialConfig {
  introductionFee: number;
}

export interface Worker {
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
  financialConfig: FinancialConfig;
  createdAt: string;
  updatedAt: string;
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

export type InvoiceFeeType = 'management' | 'flight' | 'training';

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

export interface Invoice {
  id: string;
  invoiceNo: string;
  workerId: string;
  workerName: string;
  passportNo: string;
  hostCompany: string;
  supervisingOrg: string;
  feeType: InvoiceFeeType;
  billingPeriod: string;
  lastInvoiceDate: string;
  nextInvoiceDate: string;
  totalAmount: number;
  amountReceived: number;
  outstandingAmount: number;
  paymentReceivedDate?: string;
  receiptNo?: string;
  receiptSentDate?: string;
  status: InvoiceStatus;
  currency: 'JPY' | 'MMK' | 'USD';
  notes?: string;
  createdAt: string;
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

export type StudentInvoiceFeeType = 'introduction';

export interface StudentInvoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  passportNo: string;
  hostCompany: string;
  supervisingOrg: string;
  feeType: StudentInvoiceFeeType;
  billingPeriod: string;
  lastInvoiceDate: string;
  nextInvoiceDate: string;
  totalAmount: number;
  amountReceived: number;
  outstandingAmount: number;
  paymentReceivedDate?: string;
  receiptNo?: string;
  receiptSentDate?: string;
  status: InvoiceStatus;
  currency: 'JPY' | 'MMK' | 'USD';
  notes?: string;
  createdAt: string;
}

export interface StudentInvoicePayment {
  id: string;
  invoiceId: string;
  invoiceNo?: string;
  studentId?: string;
  studentName?: string;
  feeType?: StudentInvoiceFeeType;
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

export interface InvoiceWorkerSummary {
  workerId: string;
  workerName: string;
  passportNo: string;
  hostCompany: string;
  serialNo?: string;
  feeType: InvoiceFeeType;
  totalAmount: number;
  totalPaid: number;
  remainAmount: number;
  invoiceCount: number;
  paymentCount: number;
}

export interface DashboardStats {
  totalWorkers: number;
  activeWorkers: number;
  contractEndedWorkers: number;
  abscondedWorkers: number;
  abscondingRate: number;
  totalInvoicesCount: number;
  pendingInvoicesCount: number;
  upcomingInvoicesCount7Days: number;
  contractExpiring30DaysCount: number;
  totalOutstandingAmountJPY: number;
  totalCollectedAmountJPY: number;
  unsentReceiptsCount: number;
}
