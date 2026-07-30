/**
 * Role-based permission map for Sabzi Mandi.
 * Owner inherits all permissions.
 */

export const ROLES = ['owner', 'admin', 'accountant', 'salesman', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'settings.manage',
  'users.manage',
  'parties.read',
  'parties.write',
  'products.read',
  'products.write',
  'units.read',
  'units.write',
  'purchases.read',
  'purchases.write',
  'purchases.confirm',
  'purchases.cancel',
  'sales.read',
  'sales.write',
  'sales.confirm',
  'sales.cancel',
  'payments.read',
  'payments.write',
  'ledger.read',
  'inventory.read',
  'inventory.adjust',
  'cashbook.read',
  'cashbook.write',
  'expenses.read',
  'expenses.write',
  'reports.read',
  'dashboard.read',
  'audit.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL,
  accountant: [
    'parties.read',
    'parties.write',
    'products.read',
    'products.write',
    'units.read',
    'units.write',
    'purchases.read',
    'purchases.write',
    'purchases.confirm',
    'purchases.cancel',
    'sales.read',
    'sales.write',
    'sales.confirm',
    'sales.cancel',
    'payments.read',
    'payments.write',
    'ledger.read',
    'inventory.read',
    'inventory.adjust',
    'cashbook.read',
    'cashbook.write',
    'expenses.read',
    'expenses.write',
    'reports.read',
    'dashboard.read',
  ],
  salesman: [
    'parties.read',
    'products.read',
    'units.read',
    'sales.read',
    'sales.write',
    'sales.confirm',
    'payments.read',
    'payments.write',
    'ledger.read',
    'inventory.read',
    'reports.read',
    'dashboard.read',
  ],
  viewer: [
    'parties.read',
    'products.read',
    'units.read',
    'sales.read',
    'purchases.read',
    'payments.read',
    'ledger.read',
    'inventory.read',
    'cashbook.read',
    'expenses.read',
    'reports.read',
    'dashboard.read',
  ],
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
