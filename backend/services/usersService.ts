import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  defaultPermissionsForRole,
  normalizePermissions,
  PERMISSION_MODULES,
  type UserPermissions,
  type UserRole,
} from '../utils/permissions.js';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  isActive: boolean;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
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
  created_at: Date | string;
  updated_at: Date | string;
}

function parsePerms(row: UserRow): UserPermissions {
  let raw: unknown = row.permissions;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  return normalizePermissions(raw, row.role);
}

function mapUser(row: UserRow): ManagedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    title: row.title || `${row.role} User`,
    isActive: Boolean(row.is_active),
    permissions: parsePerms(row),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listUsers(): Promise<ManagedUser[]> {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email, password, role, title, is_active, permissions, created_at, updated_at
     FROM users
     ORDER BY FIELD(role, 'Admin', 'Manager', 'Staff'), name ASC`
  );
  return rows.map(mapUser);
}

export async function getUserById(id: string): Promise<ManagedUser | null> {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email, password, role, title, is_active, permissions, created_at, updated_at
     FROM users WHERE id = :id LIMIT 1`,
    { id }
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export interface UpsertUserInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  title?: string;
  isActive?: boolean;
  permissions?: unknown;
}

export async function createUser(input: UpsertUserInput): Promise<ManagedUser> {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password?.trim();
  const role = input.role;
  const title = input.title?.trim() || `${role} User`;

  if (!name || !email || !password) {
    throw new AppError('Name, email and password are required', 400);
  }
  if (!['Admin', 'Manager', 'Staff'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const permissions = normalizePermissions(
    input.permissions ?? defaultPermissionsForRole(role),
    role
  );

  const id = randomUUID();
  try {
    await pool.execute(
      `INSERT INTO users (id, name, email, password, role, title, is_active, permissions)
       VALUES (:id, :name, :email, :password, :role, :title, :isActive, :permissions)`,
      {
        id,
        name,
        email,
        password,
        role,
        title,
        isActive: input.isActive === false ? 0 : 1,
        permissions: JSON.stringify(permissions),
      }
    );
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      throw new AppError('Email already exists', 409);
    }
    throw err;
  }

  const created = await getUserById(id);
  if (!created) throw new AppError('Failed to create user', 500);
  return created;
}

export async function updateUser(id: string, input: UpsertUserInput): Promise<ManagedUser> {
  const existing = await getUserById(id);
  if (!existing) throw new AppError('User not found', 404);

  const name = input.name?.trim() || existing.name;
  const email = (input.email?.trim() || existing.email).toLowerCase();
  const role = input.role || existing.role;
  const title = input.title?.trim() || existing.title;
  const isActive = input.isActive === undefined ? existing.isActive : Boolean(input.isActive);
  const permissions = normalizePermissions(
    input.permissions ?? existing.permissions,
    role
  );

  if (!['Admin', 'Manager', 'Staff'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  // Keep at least one active Admin
  if (existing.role === 'Admin' && (role !== 'Admin' || !isActive)) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM users WHERE role = 'Admin' AND is_active = 1 AND id <> :id`,
      { id }
    );
    if (Number(rows[0].c) === 0) {
      throw new AppError('Cannot deactivate or demote the last Admin', 400);
    }
  }

  const password = input.password?.trim();
  if (password) {
    await pool.execute(
      `UPDATE users
       SET name = :name, email = :email, password = :password, role = :role,
           title = :title, is_active = :isActive, permissions = :permissions
       WHERE id = :id`,
      {
        id,
        name,
        email,
        password,
        role,
        title,
        isActive: isActive ? 1 : 0,
        permissions: JSON.stringify(permissions),
      }
    );
  } else {
    await pool.execute(
      `UPDATE users
       SET name = :name, email = :email, role = :role,
           title = :title, is_active = :isActive, permissions = :permissions
       WHERE id = :id`,
      {
        id,
        name,
        email,
        role,
        title,
        isActive: isActive ? 1 : 0,
        permissions: JSON.stringify(permissions),
      }
    );
  }

  const updated = await getUserById(id);
  if (!updated) throw new AppError('User not found after update', 404);
  return updated;
}

export async function deleteUser(id: string, actorId?: string): Promise<void> {
  if (actorId && actorId === id) {
    throw new AppError('Cannot delete your own account', 400);
  }

  const existing = await getUserById(id);
  if (!existing) throw new AppError('User not found', 404);

  if (existing.role === 'Admin') {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM users WHERE role = 'Admin' AND is_active = 1 AND id <> :id`,
      { id }
    );
    if (Number(rows[0].c) === 0) {
      throw new AppError('Cannot delete the last Admin', 400);
    }
  }

  const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM users WHERE id = :id`, {
    id,
  });
  if (result.affectedRows === 0) throw new AppError('User not found', 404);
}

export async function ensurePermissionsColumn(): Promise<void> {
  try {
    await pool.execute(`ALTER TABLE users ADD COLUMN permissions JSON NULL AFTER is_active`);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
      // ignore if already exists or table missing during first boot
    }
  }

  // Backfill / migrate permissions so newly added modules (e.g. students) are present
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, role, permissions FROM users`
  );
  for (const row of rows) {
    let raw: unknown = row.permissions;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    const missingModule =
      !raw ||
      typeof raw !== 'object' ||
      PERMISSION_MODULES.some((mod) => !(mod in (raw as object)));
    if (!missingModule) continue;

    const perms = normalizePermissions(raw, row.role);
    await pool.execute(`UPDATE users SET permissions = :permissions WHERE id = :id`, {
      id: row.id,
      permissions: JSON.stringify(perms),
    });
  }
}
