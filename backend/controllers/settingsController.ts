import type { Request, Response } from 'express';
import * as settingsService from '../services/settingsService.js';

export async function getPrint(req: Request, res: Response): Promise<void> {
  const settings = await settingsService.getPrintSettings();
  res.json(settings);
}

export async function updatePrint(req: Request, res: Response): Promise<void> {
  const settings = await settingsService.updatePrintSettings({
    agencyName: typeof req.body?.agencyName === 'string' ? req.body.agencyName : undefined,
    address: typeof req.body?.address === 'string' ? req.body.address : undefined,
    phone: typeof req.body?.phone === 'string' ? req.body.phone : undefined,
    logoData:
      req.body?.logoData === null
        ? null
        : typeof req.body?.logoData === 'string'
          ? req.body.logoData
          : undefined,
  });
  res.json(settings);
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
    sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
  });
  res.status(201).json(variable);
}

export async function updateVariable(req: Request, res: Response): Promise<void> {
  const variable = await settingsService.updateVariable(req.params.id, {
    value: typeof req.body?.value === 'string' ? req.body.value : undefined,
    sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
    isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
  });
  res.json(variable);
}

export async function deleteVariable(req: Request, res: Response): Promise<void> {
  await settingsService.deleteVariable(req.params.id);
  res.json({ success: true });
}
