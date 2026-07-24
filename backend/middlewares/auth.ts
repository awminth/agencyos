import type { NextFunction, Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from './errorHandler.js';
import {
  normalizePermissions,
  type UserPermissions,
  type UserRole,
} from '../utils/permissions.js';

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  permissions: UserPermissions;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: RequestUser;
    }
  }
}

interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string | null;
  is_active: number;
  permissions: string | UserPermissions | null;
}

/** Attach user from X-User-Id header (simple session bridge; passwords stay plain). */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const userId = String(req.header('x-user-id') || '').trim();
  if (!userId) {
    next();
    return;
  }

  try {
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, name, email, role, title, is_active, permissions
       FROM users WHERE id = :id LIMIT 1`,
      { id: userId }
    );
    const row = rows[0];
    if (row && row.is_active) {
      req.currentUser = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        title: row.title || `${row.role} User`,
        permissions: normalizePermissions(
          typeof row.permissions === 'string'
            ? JSON.parse(row.permissions)
            : row.permissions,
          row.role
        ),
      };
    }
  } catch {
    // column may not exist yet — ignore
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.currentUser) {
    next(new AppError('Authentication required', 401));
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.currentUser) {
    next(new AppError('Authentication required', 401));
    return;
  }
  if (req.currentUser.role !== 'Admin' && !req.currentUser.permissions.users.read) {
    next(new AppError('Admin or users permission required', 403));
    return;
  }
  next();
}

export function requireUsersManage(req: Request, _res: Response, next: NextFunction) {
  if (!req.currentUser) {
    next(new AppError('Authentication required', 401));
    return;
  }
  const p = req.currentUser.permissions.users;
  if (!p.read && !p.create && !p.update && !p.delete) {
    next(new AppError('User accounts permission required', 403));
    return;
  }
  next();
}
