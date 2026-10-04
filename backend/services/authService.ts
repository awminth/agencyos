import { randomBytes } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
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
  sessionToken?: string;
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

interface SessionRow extends RowDataPacket {
  user_id: string;
  session_token: string;
  device_label: string | null;
  last_seen_at: Date | string;
}

/** Session without heartbeat is treated as free after this many minutes. */
const SESSION_STALE_MINUTES = 30;

export async function ensureUserSessionsTable(): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      user_id VARCHAR(64) PRIMARY KEY,
      session_token VARCHAR(128) NOT NULL,
      device_label VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_sessions_token (session_token)
    )
  `);
}

function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

function mapAuthUser(user: UserRow, sessionToken?: string): AuthUser {
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
    ...(sessionToken ? { sessionToken } : {}),
  };
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  let rows: UserRow[];
  try {
    const [result] = await pool.execute<UserRow[]>(
      `SELECT id, name, email, password, role, title, is_active, permissions
       FROM users
       WHERE email = :email
       LIMIT 1`,
      { email }
    );
    rows = result;
  } catch {
    const [result] = await pool.execute<UserRow[]>(
      `SELECT id, name, email, password, role, title, is_active
       FROM users
       WHERE email = :email
       LIMIT 1`,
      { email }
    );
    rows = result;
  }
  return rows[0] || null;
}

function isSessionFresh(lastSeen: Date | string): boolean {
  const t = lastSeen instanceof Date ? lastSeen.getTime() : new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < SESSION_STALE_MINUTES * 60 * 1000;
}

/**
 * Plain-text password match. One active session per account (single device).
 * Re-login on the same device is allowed when existingSessionToken matches.
 */
export async function loginWithEmailPassword(
  email: string,
  password: string,
  options?: { existingSessionToken?: string; deviceLabel?: string }
): Promise<AuthUser> {
  await ensureUserSessionsTable();

  const trimmedEmail = email.trim();
  const trimmedPassword = password;

  if (!trimmedEmail || !trimmedPassword) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await findUserByEmail(trimmedEmail);
  if (!user || user.password !== trimmedPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.is_active) {
    throw new AppError('This account is inactive', 403);
  }

  const [sessions] = await pool.execute<SessionRow[]>(
    `SELECT user_id, session_token, device_label, last_seen_at
     FROM user_sessions WHERE user_id = :userId LIMIT 1`,
    { userId: user.id }
  );
  const existing = sessions[0];
  const existingToken = (options?.existingSessionToken || '').trim();
  const deviceLabel = (options?.deviceLabel || '').trim().slice(0, 255) || null;

  if (existing && isSessionFresh(existing.last_seen_at)) {
    // Same device / same browser tab restoring login
    if (existingToken && existingToken === existing.session_token) {
      await pool.execute(
        `UPDATE user_sessions
         SET last_seen_at = CURRENT_TIMESTAMP,
             device_label = COALESCE(:deviceLabel, device_label)
         WHERE user_id = :userId`,
        { userId: user.id, deviceLabel }
      );
      return mapAuthUser(user, existing.session_token);
    }

    throw new AppError(
      'ဤအကောင့်သည် အခြား Device / Browser တွင် Login ဝင်ထားပြီး ဖြစ်နေပါသည်။ ထို Device မှ Logout လုပ်ပြီးမှ ဤနေရာမှ ဝင်နိုင်ပါသည်။',
      409,
      undefined,
      'SESSION_ACTIVE'
    );
  }

  const sessionToken = newSessionToken();
  await pool.execute(
    `INSERT INTO user_sessions (user_id, session_token, device_label, last_seen_at)
     VALUES (:userId, :token, :deviceLabel, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       session_token = VALUES(session_token),
       device_label = VALUES(device_label),
       last_seen_at = CURRENT_TIMESTAMP`,
    { userId: user.id, token: sessionToken, deviceLabel }
  );

  return mapAuthUser(user, sessionToken);
}

export async function logoutSession(
  userId: string,
  sessionToken: string
): Promise<void> {
  await ensureUserSessionsTable();
  const uid = userId.trim();
  const token = sessionToken.trim();
  if (!uid || !token) return;

  await pool.execute(
    `DELETE FROM user_sessions
     WHERE user_id = :userId AND session_token = :token`,
    { userId: uid, token }
  );
}

export async function heartbeatSession(
  userId: string,
  sessionToken: string
): Promise<{ ok: true }> {
  await ensureUserSessionsTable();
  const uid = userId.trim();
  const token = sessionToken.trim();
  if (!uid || !token) {
    throw new AppError('Session required', 401, undefined, 'SESSION_INVALID');
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE user_sessions
     SET last_seen_at = CURRENT_TIMESTAMP
     WHERE user_id = :userId AND session_token = :token`,
    { userId: uid, token }
  );

  if (result.affectedRows === 0) {
    throw new AppError(
      'သင့် Login Session သက်တမ်းကုန်သွားပါပြီ (သို့) အခြား Device မှ ဝင်ထားသောကြောင့် ထွက်ရပါမည်။',
      401,
      undefined,
      'SESSION_INVALID'
    );
  }

  return { ok: true };
}

export async function assertActiveSession(
  userId: string,
  sessionToken: string
): Promise<boolean> {
  await ensureUserSessionsTable();
  const [rows] = await pool.execute<SessionRow[]>(
    `SELECT user_id, session_token, last_seen_at
     FROM user_sessions
     WHERE user_id = :userId AND session_token = :token
     LIMIT 1`,
    { userId, token: sessionToken }
  );
  const row = rows[0];
  if (!row) return false;
  return isSessionFresh(row.last_seen_at);
}
