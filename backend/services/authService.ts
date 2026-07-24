import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  normalizePermissions,
  type UserPermissions,
  type UserRole,
} from '../utils/permissions.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  permissions: UserPermissions;
}

interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  title: string | null;
  is_active: number;
  permissions: string | UserPermissions | null;
}

/** Plain-text password match only — no encode/decode/hash. */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<AuthUser> {
  const trimmedEmail = email.trim();
  const trimmedPassword = password;

  if (!trimmedEmail || !trimmedPassword) {
    throw new AppError('Email and password are required', 400);
  }

  let rows: UserRow[];
  try {
    const [result] = await pool.execute<UserRow[]>(
      `SELECT id, name, email, password, role, title, is_active, permissions
       FROM users
       WHERE email = :email
       LIMIT 1`,
      { email: trimmedEmail }
    );
    rows = result;
  } catch {
    const [result] = await pool.execute<UserRow[]>(
      `SELECT id, name, email, password, role, title, is_active
       FROM users
       WHERE email = :email
       LIMIT 1`,
      { email: trimmedEmail }
    );
    rows = result;
  }

  const user = rows[0];
  if (!user || user.password !== trimmedPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.is_active) {
    throw new AppError('This account is inactive', 403);
  }

  let rawPerms: unknown = user.permissions ?? null;
  if (typeof rawPerms === 'string') {
    try {
      rawPerms = JSON.parse(rawPerms);
    } catch {
      rawPerms = null;
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    title: user.title || `${user.role} User`,
    permissions: normalizePermissions(rawPerms, user.role),
  };
}
