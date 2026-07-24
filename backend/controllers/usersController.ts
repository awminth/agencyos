import type { Request, Response } from 'express';
import * as usersService from '../services/usersService.js';
import { defaultPermissionsForRole, type UserRole } from '../utils/permissions.js';
import { AppError } from '../middlewares/errorHandler.js';

export async function list(req: Request, res: Response): Promise<void> {
  const actor = req.currentUser!;
  if (!actor.permissions.users.read) {
    throw new AppError('No permission to view user accounts', 403);
  }
  const users = await usersService.listUsers();
  res.json(users);
}

export async function getDefaults(req: Request, res: Response): Promise<void> {
  const role = (req.query.role as UserRole) || 'Staff';
  if (!['Admin', 'Manager', 'Staff'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  res.json(defaultPermissionsForRole(role));
}

export async function create(req: Request, res: Response): Promise<void> {
  const actor = req.currentUser!;
  if (!actor.permissions.users.create) {
    throw new AppError('No permission to create user accounts', 403);
  }
  const user = await usersService.createUser(req.body || {});
  res.status(201).json(user);
}

export async function update(req: Request, res: Response): Promise<void> {
  const actor = req.currentUser!;
  if (!actor.permissions.users.update) {
    throw new AppError('No permission to update user accounts', 403);
  }
  const user = await usersService.updateUser(req.params.id, req.body || {});
  res.json(user);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const actor = req.currentUser!;
  if (!actor.permissions.users.delete) {
    throw new AppError('No permission to delete user accounts', 403);
  }
  await usersService.deleteUser(req.params.id, actor.id);
  res.status(204).send();
}
