import { UserRole, normalizeRole } from '@/types';
import { AuthenticatedUser } from './verify-token';
import { AuthorizationError } from '../lib/errors';

export type Permission =
  | 'products:create'
  | 'products:update_own'
  | 'products:delete_own'
  | 'products:manage_all'
  | 'inventory:manage_own'
  | 'inventory:view_own'
  | 'orders:create'
  | 'orders:view_own'
  | 'orders:manage_status'
  | 'routes:view_assigned'
  | 'routes:update_assigned'
  | 'admin:all';

const BUYER_PERMISSIONS: Permission[] = [
  'orders:create',
  'orders:view_own',
];

/**
 * Authoritative role-to-permissions mapping matrix.
 * Both 'buyer' and 'bulk_buyer' map to the canonical buyer permissions.
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  farmer: [
    'products:create',
    'products:update_own',
    'products:delete_own',
    'inventory:manage_own',
    'inventory:view_own',
    'orders:view_own',
  ],
  fpo: [
    'products:create',
    'products:update_own',
    'products:delete_own',
    'inventory:manage_own',
    'inventory:view_own',
    'orders:view_own',
  ],
  consumer: [
    'orders:create',
    'orders:view_own',
  ],
  buyer: BUYER_PERMISSIONS,
  bulk_buyer: BUYER_PERMISSIONS,
  logistics: [
    'routes:view_assigned',
    'routes:update_assigned',
    'orders:view_own',
    'orders:manage_status',
  ],
  admin: [
    'admin:all',
    'products:create',
    'products:update_own',
    'products:delete_own',
    'products:manage_all',
    'inventory:manage_own',
    'inventory:view_own',
    'orders:create',
    'orders:view_own',
    'orders:manage_status',
    'routes:view_assigned',
    'routes:update_assigned',
  ],
};

/**
 * Checks if a user has a specific permission.
 */
export function hasPermission(user: AuthenticatedUser, permission: Permission): boolean {
  const canonical = normalizeRole(user.role);
  if (canonical === 'admin') {
    return true;
  }
  const userPermissions = ROLE_PERMISSIONS[canonical] || [];
  return userPermissions.includes(permission);
}

/**
 * Guards an endpoint by enforcing that the authenticated user has at least one of the allowed roles.
 * Administrators bypass standard role checks.
 */
export function requireRole(user: AuthenticatedUser, ...allowedRoles: UserRole[]): void {
  const userRole = normalizeRole(user.role);
  if (userRole === 'admin') {
    return;
  }
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  if (!normalizedAllowed.includes(userRole)) {
    throw new AuthorizationError(
      `Role '${user.role}' is not authorized to access this resource. Required role: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Enforces exact role requirements without automatic admin bypass.
 * Used for operations (e.g. agricultural crop listing creation) where an administrator
 * identity cannot substitute for a legitimate agricultural producer account.
 */
export function requireExactRole(user: AuthenticatedUser, ...allowedRoles: UserRole[]): void {
  const userRole = normalizeRole(user.role);
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  if (!normalizedAllowed.includes(userRole)) {
    throw new AuthorizationError(
      `Role '${user.role}' is not authorized for this operation. Required role: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Enforces resource ownership. Normal users may only mutate or view resources they own;
 * admins bypass ownership restrictions.
 */
export function requireOwnershipOrAdmin(
  user: AuthenticatedUser,
  resourceOwnerId: string,
  resourceName: string = 'resource'
): void {
  const userRole = normalizeRole(user.role);
  if (userRole === 'admin') {
    return;
  }
  if (!resourceOwnerId || typeof resourceOwnerId !== 'string' || resourceOwnerId.trim() === '') {
    throw new AuthorizationError(`Invalid resource owner identifier for ${resourceName}. Access denied.`);
  }
  if (user.uid !== resourceOwnerId) {
    throw new AuthorizationError(
      `Access denied. You do not own this ${resourceName} and are not permitted to modify or view it.`
    );
  }
}

/**
 * Checks if a user is an authorized participant in an order (buyer, seller, assigned logistics, or admin).
 */
export function canAccessOrder(
  user: AuthenticatedUser,
  order: { buyerId: string; sellerId: string; routeId?: string }
): boolean {
  if (user.role === 'admin') {
    return true;
  }
  if (user.uid === order.buyerId || user.uid === order.sellerId) {
    return true;
  }
  if (user.role === 'logistics' && order.routeId) {
    // Logistics users can view orders linked to active transit
    return true;
  }
  return false;
}
