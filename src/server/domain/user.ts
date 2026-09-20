import { z } from 'zod';
import { Identifiable } from '../repositories/base.repository';
import {
  CanonicalRole,
  USER_ROLES,
  FarmerProfile,
  FPOProfile,
  BuyerProfile,
  ConsumerProfile,
  LogisticsProfile,
  normalizeRole,
} from '@/types';

export type UserAccountStatus = 'active' | 'suspended' | 'deactivated' | 'pending_onboarding';

export interface LocationData {
  villageOrCity: string;
  district: string;
  state: string;
  pincode: string;
}

/**
 * Authoritative Server User Profile stored in Firestore at collections.USERS ('users/{uid}')
 */
export interface ServerUserProfile extends Identifiable {
  id: string; // Document ID === Firebase Auth UID
  uid: string; // Firebase Auth UID
  email: string;
  role: CanonicalRole;
  name: string;
  phone?: string;
  organization?: string;
  location?: LocationData;
  avatarUrl?: string;
  verified: boolean;
  status: UserAccountStatus;
  joinedDate: string;
  rating?: number;
  // Role-specific domain sub-profiles
  farmerProfile?: FarmerProfile;
  fpoProfile?: FPOProfile;
  buyerProfile?: BuyerProfile;
  consumerProfile?: ConsumerProfile;
  logisticsProfile?: LogisticsProfile;
  // Specific identifiers
  kisanId?: string;
  fpoRegNumber?: string;
  gstin?: string;
  // Audit timestamps
  createdAt: string;
  updatedAt: string;
}

// Allowed roles for self-onboarding (ADMIN is strictly excluded)
export const ONBOARDING_ROLES = ['farmer', 'fpo', 'buyer', 'consumer', 'logistics'] as const;
export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

const locationSchema = z.object({
  villageOrCity: z.string().min(1, 'Village or city is required').max(100),
  district: z.string().min(1, 'District is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be a 6-digit number'),
});

const farmerProfileSchema = z.object({
  kisanId: z.string().min(1).max(50),
  landHoldingAcres: z.number().positive().optional(),
  primaryCrops: z.array(z.string().max(50)).optional(),
});

const fpoProfileSchema = z.object({
  fpoRegNumber: z.string().min(1).max(50),
  memberFarmersCount: z.number().int().nonnegative(),
  aggregationDistricts: z.array(z.string().max(50)).optional(),
});

const buyerProfileSchema = z.object({
  gstin: z.string().min(15).max(15),
  businessType: z.enum(['supermarket', 'processing', 'horeca', 'exporter']),
  procurementCycle: z.string().optional(),
});

const consumerProfileSchema = z.object({
  deliveryInstructions: z.string().max(250).optional(),
});

const logisticsProfileSchema = z.object({
  fleetSize: z.number().int().positive(),
  primaryVehicleType: z.string().min(1).max(50),
  corridorStates: z.array(z.string().max(50)).optional(),
});

/**
 * Strict schema for PATCH /api/v1/users/me
 * Disallows mutating uid, id, role, verified, status, rating, createdAt, updatedAt.
 */
export const UpdateProfileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().regex(/^\+?[0-9\s-]{10,15}$/, 'Invalid phone number format').optional(),
    organization: z.string().max(150).optional(),
    location: locationSchema.optional(),
    avatarUrl: z.string().url('Avatar must be a valid URL').optional(),
    farmerProfile: farmerProfileSchema.optional(),
    fpoProfile: fpoProfileSchema.optional(),
    buyerProfile: buyerProfileSchema.optional(),
    consumerProfile: consumerProfileSchema.optional(),
    logisticsProfile: logisticsProfileSchema.optional(),
    kisanId: z.string().max(50).optional(),
    fpoRegNumber: z.string().max(50).optional(),
    gstin: z.string().max(15).optional(),
  })
  .strict(); // Rejects any unexpected or privileged fields

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * Strict schema for POST /api/v1/users/onboard
 * Rejects 'admin' self-assignment.
 */
export const OnboardingSchema = z
  .object({
    role: z
      .string()
      .transform((val) => normalizeRole(val))
      .refine(
        (role): role is OnboardingRole => ONBOARDING_ROLES.includes(role as OnboardingRole),
        {
          message: 'Invalid onboarding role. Self-assignment of administrative roles is prohibited.',
        }
      ),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    phone: z.string().regex(/^\+?[0-9\s-]{10,15}$/, 'Invalid phone number format').optional(),
    organization: z.string().max(150).optional(),
    location: locationSchema.optional(),
    avatarUrl: z.string().url('Avatar must be a valid URL').optional(),
    farmerProfile: farmerProfileSchema.optional(),
    fpoProfile: fpoProfileSchema.optional(),
    buyerProfile: buyerProfileSchema.optional(),
    consumerProfile: consumerProfileSchema.optional(),
    logisticsProfile: logisticsProfileSchema.optional(),
    kisanId: z.string().max(50).optional(),
    fpoRegNumber: z.string().max(50).optional(),
    gstin: z.string().max(15).optional(),
  })
  .strict();

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
