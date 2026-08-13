import type { Request, Response } from 'express';
import * as settingsService from '../services/settingsService.js';

export async function getPrint(req: Request, res: Response): Promise<void> {
  const both = await settingsService.getBothPrintSettings();
  res.json(both);
}

export async function updatePrint(req: Request, res: Response): Promise<void> {
  const slotRaw = req.body?.slot;
  const slot =
    slotRaw === 2 || slotRaw === '2' ? 2 : slotRaw === 1 || slotRaw === '1' ? 1 : 1;
  const settings = await settingsService.updatePrintSettings({
    slot,
    agencyName: typeof req.body?.agencyName === 'string' ? req.body.agencyName : undefined,
    address: typeof req.body?.address === 'string' ? req.body.address : undefined,
    phone: typeof req.body?.phone === 'string' ? req.body.phone : undefined,
    registrationNo:
      typeof req.body?.registrationNo === 'string' ? req.body.registrationNo : undefined,
    fax: typeof req.body?.fax === 'string' ? req.body.fax : undefined,
    logoData:
      req.body?.logoData === null
        ? null
        : typeof req.body?.logoData === 'string'
          ? req.body.logoData
          : undefined,
  });
  res.json(settings);
}

export async function listBankAccounts(req: Request, res: Response): Promise<void> {
  const activeOnly = req.query.activeOnly === '1' || req.query.activeOnly === 'true';
  const accounts = await settingsService.listBankAccounts(activeOnly);
  res.json(accounts);
}

export async function createBankAccount(req: Request, res: Response): Promise<void> {
  const account = await settingsService.createBankAccount({
    label: typeof req.body?.label === 'string' ? req.body.label : undefined,
    bankName: typeof req.body?.bankName === 'string' ? req.body.bankName : undefined,
    branchCode: typeof req.body?.branchCode === 'string' ? req.body.branchCode : undefined,
    branchName: typeof req.body?.branchName === 'string' ? req.body.branchName : undefined,
    accountNumber:
      typeof req.body?.accountNumber === 'string' ? req.body.accountNumber : undefined,
    accountHolder:
      typeof req.body?.accountHolder === 'string' ? req.body.accountHolder : undefined,
    isDefault: typeof req.body?.isDefault === 'boolean' ? req.body.isDefault : undefined,
    sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
  });
  res.status(201).json(account);
}

export async function updateBankAccount(req: Request, res: Response): Promise<void> {
  const account = await settingsService.updateBankAccount(req.params.id, {
    label: typeof req.body?.label === 'string' ? req.body.label : undefined,
    bankName: typeof req.body?.bankName === 'string' ? req.body.bankName : undefined,
    branchCode: typeof req.body?.branchCode === 'string' ? req.body.branchCode : undefined,
    branchName: typeof req.body?.branchName === 'string' ? req.body.branchName : undefined,
    accountNumber:
      typeof req.body?.accountNumber === 'string' ? req.body.accountNumber : undefined,
    accountHolder:
      typeof req.body?.accountHolder === 'string' ? req.body.accountHolder : undefined,
    isDefault: typeof req.body?.isDefault === 'boolean' ? req.body.isDefault : undefined,
    sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
    isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
  });
  res.json(account);
}

export async function deleteBankAccount(req: Request, res: Response): Promise<void> {
  await settingsService.deleteBankAccount(req.params.id);
  res.json({ success: true });
}

export async function getCurrency(req: Request, res: Response): Promise<void> {
  const settings = await settingsService.getCurrencySettings();
  res.json(settings);
}

export async function updateCurrency(req: Request, res: Response): Promise<void> {
  const settings = await settingsService.updateCurrencySettings({
    jpyToMmkRate:
      req.body?.jpyToMmkRate !== undefined ? Number(req.body.jpyToMmkRate) : undefined,
    displayCurrency:
      typeof req.body?.displayCurrency === 'string' ? req.body.displayCurrency : undefined,
  });
  res.json(settings);
}

export async function listVariables(req: Request, res: Response): Promise<void> {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const activeOnly = req.query.activeOnly === '1' || req.query.activeOnly === 'true';
  const variables = await settingsService.listVariables(category, activeOnly);
  res.json(variables);
}

export async function createVariable(req: Request, res: Response): Promise<void> {
  const variable = await settingsService.createVariable({
    category: typeof req.body?.category === 'string' ? req.body.category : '',
    value: typeof req.body?.value === 'string' ? req.body.value : '',
    parentValue: typeof req.body?.parentValue === 'string' ? req.body.parentValue : undefined,
    sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
  });
  res.status(201).json(variable);
}

export async function updateVariable(req: Request, res: Response): Promise<void> {
  const variable = await settingsService.updateVariable(req.params.id, {
    value: typeof req.body?.value === 'string' ? req.body.value : undefined,
    parentValue:
      req.body?.parentValue === null
        ? null
        : typeof req.body?.parentValue === 'string'
          ? req.body.parentValue
          : undefined,
    sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
    isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
  });
  res.json(variable);
}

export async function deleteVariable(req: Request, res: Response): Promise<void> {
  await settingsService.deleteVariable(req.params.id);
  res.json({ success: true });
}
