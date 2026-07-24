export type PermissionModule =
  | 'dashboard'
  | 'workers'
  | 'students'
  | 'deployments'
  | 'invoices'
  | 'reports'
  | 'settings'
  | 'users';

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export interface ModulePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type UserPermissions = Record<PermissionModule, ModulePermission>;

export const PERMISSION_MODULES: PermissionModule[] = [
  'dashboard',
  'workers',
  'students',
  'deployments',
  'invoices',
  'reports',
  'settings',
  'users',
];

export const CRUD_ACTIONS: CrudAction[] = ['create', 'read', 'update', 'delete'];

function crud(c: boolean, r: boolean, u: boolean, d: boolean): ModulePermission {
  return { create: c, read: r, update: u, delete: d };
}

export function emptyPermissions(readAll = false): UserPermissions {
  const r = readAll;
  return {
    dashboard: crud(false, r, false, false),
    workers: crud(false, r, false, false),
    students: crud(false, r, false, false),
    deployments: crud(false, r, false, false),
    invoices: crud(false, r, false, false),
    reports: crud(false, r, false, false),
    settings: crud(false, r, false, false),
    users: crud(false, false, false, false),
  };
}

export function defaultPermissionsForRole(
  role: 'Admin' | 'Manager' | 'Staff'
): UserPermissions {
  if (role === 'Admin') {
    return {
      dashboard: crud(false, true, false, false),
      workers: crud(true, true, true, true),
      students: crud(true, true, true, true),
      deployments: crud(true, true, true, true),
      invoices: crud(true, true, true, true),
      reports: crud(true, true, true, true),
      settings: crud(true, true, true, true),
      users: crud(true, true, true, true),
    };
  }
  if (role === 'Manager') {
    return {
      dashboard: crud(false, true, false, false),
      workers: crud(true, true, true, false),
      students: crud(true, true, true, false),
      deployments: crud(true, true, true, false),
      invoices: crud(true, true, true, false),
      reports: crud(true, true, false, false),
      settings: crud(false, true, true, false),
      users: crud(false, false, false, false),
    };
  }
  return {
    dashboard: crud(false, true, false, false),
    workers: crud(false, true, false, false),
    students: crud(false, true, false, false),
    deployments: crud(false, true, false, false),
    invoices: crud(false, true, false, false),
    reports: crud(false, true, false, false),
    settings: crud(false, false, false, false),
    users: crud(false, false, false, false),
  };
}

/**
 * Merge stored/partial permission JSON with role defaults so newly added
 * modules (e.g. `students`) appear correctly without requiring re-save.
 * Matches backend/utils/permissions.normalizePermissions.
 */
export function normalizePermissions(
  raw: unknown,
  role: 'Admin' | 'Manager' | 'Staff'
): UserPermissions {
  const defaults = defaultPermissionsForRole(role);
  if (!raw || typeof raw !== 'object') return defaults;

  const src = raw as Partial<Record<PermissionModule, Partial<ModulePermission>>>;
  const out = emptyPermissions(false);

  for (const mod of PERMISSION_MODULES) {
    const m = src[mod];
    out[mod] = {
      create: Boolean(m?.create ?? defaults[mod].create),
      read: Boolean(m?.read ?? defaults[mod].read),
      update: Boolean(m?.update ?? defaults[mod].update),
      delete: Boolean(m?.delete ?? defaults[mod].delete),
    };
  }
  return out;
}

export function can(
  permissions: UserPermissions | null | undefined,
  module: PermissionModule,
  action: CrudAction
): boolean {
  if (!permissions) return false;
  return Boolean(permissions[module]?.[action]);
}

export function authHeaders(userId?: string): HeadersInit {
  return userId ? { 'X-User-Id': userId, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}
