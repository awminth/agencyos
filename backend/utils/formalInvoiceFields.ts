import { AppError } from '../middlewares/errorHandler.js';
import { getBankAccountById } from '../services/settingsService.js';
import { normalizeTaxRate } from './invoiceTax.js';

export interface FormalInvoiceFields {
  billedToAttn: string;
  subject: string;
  taxRate: number;
  bankAccountId: string;
  bankName: string;
  branchCode: string;
  branchName: string;
  accountNumber: string;
  accountHolder: string;
}

/** Validate and snapshot bank + formal invoice fields required before issue. */
export async function resolveFormalInvoiceFields(input: {
  billedToAttn?: string | null;
  subject?: string | null;
  taxRate?: number | string | null;
  bankAccountId?: string | null;
  requireComplete?: boolean;
  existing?: Partial<FormalInvoiceFields> | null;
}): Promise<FormalInvoiceFields> {
  const requireComplete = input.requireComplete !== false;
  const billedToAttn = (input.billedToAttn ?? input.existing?.billedToAttn ?? '').trim();
  const subject = (input.subject ?? input.existing?.subject ?? '').trim();
  const taxRate = normalizeTaxRate(
    input.taxRate !== undefined && input.taxRate !== null
      ? input.taxRate
      : input.existing?.taxRate,
    0
  );
  const bankAccountId = (input.bankAccountId ?? input.existing?.bankAccountId ?? '').trim();

  if (requireComplete) {
    if (!billedToAttn) throw new AppError('Billed To (Attn) ဖြည့်ပါ။', 400);
    if (!subject) throw new AppError('Subject ဖြည့်ပါ။', 400);
    if (!bankAccountId) throw new AppError('Bank account ရွေးပါ။', 400);
  }

  if (bankAccountId) {
    const bank = await getBankAccountById(bankAccountId);
    if (!bank.isActive) throw new AppError('ရွေးထားသော bank account သည် inactive ဖြစ်နေသည်။', 400);
    return {
      billedToAttn,
      subject,
      taxRate,
      bankAccountId: bank.id,
      bankName: bank.bankName,
      branchCode: bank.branchCode || '',
      branchName: bank.branchName || '',
      accountNumber: bank.accountNumber,
      accountHolder: bank.accountHolder,
    };
  }

  return {
    billedToAttn,
    subject,
    taxRate,
    bankAccountId: '',
    bankName: input.existing?.bankName || '',
    branchCode: input.existing?.branchCode || '',
    branchName: input.existing?.branchName || '',
    accountNumber: input.existing?.accountNumber || '',
    accountHolder: input.existing?.accountHolder || '',
  };
}
