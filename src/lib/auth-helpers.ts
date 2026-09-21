/**
 * Authentication and Mobile Validation Helpers
 * Gramora Smart Agri Marketplace (SIH 2026)
 */

import { UserRole, normalizeRole } from '@/types';
import { MOCK_USERS } from '@/mocks/users';

/**
 * Normalizes an Indian mobile number into exactly 10 digits.
 * Strips non-digits, leading country code '+91' or '91', and leading 0.
 */
export function normalizeIndianMobile(input: string): string {
  if (!input) return '';
  // Strip all non-digit characters
  let digits = input.replace(/\D/g, '');

  // Strip leading 91 if input is 12 digits (e.g. 919876543210 -> 9876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  // Strip leading 0 if 11 digits (e.g. 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Return at most 10 digits
  return digits.slice(0, 10);
}

/**
 * Validates whether the string is a valid 10-digit Indian mobile number.
 * Accepts numbers starting with 6, 7, 8, or 9, as well as demo series 900000000X.
 */
export function isValidIndianMobile(mobile: string): boolean {
  const normalized = normalizeIndianMobile(mobile);
  return /^[6-9]\d{9}$/.test(normalized);
}

export interface DemoAccountConfig {
  role: UserRole;
  mobile: string;
  placeholderPassword: string;
  email: string;
  label: string;
}

/**
 * Centralized Demo Credentials Configuration for Hackathon / Demonstration.
 * Note: These are development/demonstration placeholders.
 */
export const DEMO_ACCOUNTS: Record<string, DemoAccountConfig> = {
  farmer: {
    role: 'farmer',
    mobile: '9000000001',
    placeholderPassword: 'Demo@Farmer123',
    email: 'farmer@demo.gramora.farm',
    label: 'Farmer',
  },
  fpo: {
    role: 'fpo',
    mobile: '9000000002',
    placeholderPassword: 'Demo@Fpo123',
    email: 'fpo@demo.gramora.farm',
    label: 'FPO Collective',
  },
  buyer: {
    role: 'buyer',
    mobile: '9000000003',
    placeholderPassword: 'Demo@Buyer123',
    email: 'buyer@demo.gramora.farm',
    label: 'Buyer / Bulk Buyer',
  },
  consumer: {
    role: 'consumer',
    mobile: '9000000004',
    placeholderPassword: 'Demo@Consumer123',
    email: 'consumer@demo.gramora.farm',
    label: 'Consumer',
  },
  logistics: {
    role: 'logistics',
    mobile: '9000000005',
    placeholderPassword: 'Demo@Logistics123',
    email: 'logistics@demo.gramora.farm',
    label: 'Logistics Partner',
  },
  admin: {
    role: 'admin',
    mobile: '9000000006',
    placeholderPassword: 'Demo@Admin123',
    email: 'admin@demo.gramora.farm',
    label: 'Mission Admin',
  },
};

/**
 * Resolves a 10-digit mobile number to a compatible Firebase Auth email identifier.
 * Checks demo accounts, mock users, and defaults to a deterministic standard email format.
 */
export function resolveMobileToEmail(mobile: string): string {
  const clean = normalizeIndianMobile(mobile);

  // 1. Check known demo placeholders
  for (const account of Object.values(DEMO_ACCOUNTS)) {
    if (account.mobile === clean) {
      return account.email;
    }
  }

  // 2. Check mock users directory
  for (const user of Object.values(MOCK_USERS)) {
    const userCleanPhone = normalizeIndianMobile(user.phone);
    if (userCleanPhone === clean) {
      return user.email;
    }
  }

  // 3. Known Firestore production demo accounts
  const liveKnownUsers: Record<string, string> = {
    '9876543299': 'cloudinary.live.1789882713522@gramora.in',
    '9876543211': 'admin2@gramora.in',
    '9999999999': 'demo@gramora.farm',
    '9876543210': 'temp-user-1789880852915@test.in',
  };

  if (liveKnownUsers[clean]) {
    return liveKnownUsers[clean];
  }

  // 4. Default deterministic alias for Firebase Authentication
  return `${clean}@gramora.farm`;
}

/**
 * Compares selected UI role with server-authoritative role.
 * Accounts for legacy alias 'bulk_buyer' mapping to canonical 'buyer'.
 */
export function rolesMatch(selectedRole: string, actualRole: string): boolean {
  if (!selectedRole || !actualRole) return false;
  return normalizeRole(selectedRole) === normalizeRole(actualRole);
}

/**
 * Returns the authoritative dashboard destination path based on resolved role.
 */
export function getRoleDashboardPath(role: string): string {
  const canonical = normalizeRole(role);
  switch (canonical) {
    case 'farmer':
    case 'fpo':
      return '/farmer/dashboard';
    case 'buyer':
    case 'consumer':
      return '/buyer/dashboard';
    case 'logistics':
      return '/logistics/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/dashboard';
  }
}
