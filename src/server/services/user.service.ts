import { userRepository, UserRepository } from '../repositories/user.repository';
import {
  ServerUserProfile,
  UpdateProfileInput,
  OnboardingInput,
  ONBOARDING_ROLES,
} from '../domain/user';
import { AuthenticatedUser } from '../auth/verify-token';
import {
  ConflictError,
  NotFoundError,
  AuthorizationError,
  BadRequestError,
} from '../lib/errors';
import { logger } from '../lib/logger';
import { normalizeRole } from '@/types';

export class UserService {
  private userRepo: UserRepository;

  constructor(userRepo: UserRepository = userRepository) {
    this.userRepo = userRepo;
  }

  /**
   * Retrieves the authoritative profile for the currently authenticated user.
   * Throws NotFoundError if the user is authenticated in Firebase Auth but has not completed onboarding.
   */
  async getMe(authUser: AuthenticatedUser): Promise<ServerUserProfile> {
    if (!authUser.profileExists) {
      throw new NotFoundError(
        'User profile not found. User is registered in Firebase Auth but has not completed onboarding.',
        authUser.uid
      );
    }

    const profile = await this.userRepo.findByUid(authUser.uid);
    if (!profile) {
      throw new NotFoundError('User profile not found in database.', authUser.uid);
    }

    return profile;
  }

  /**
   * Updates non-security profile fields for the authenticated user.
   * Privileged fields (uid, role, status, verified, rating) cannot be mutated.
   */
  async updateMe(authUser: AuthenticatedUser, updates: UpdateProfileInput): Promise<ServerUserProfile> {
    const existing = await this.getMe(authUser);

    // Defense-in-depth: explicit guard against privileged fields
    const sanitizedUpdates: UpdateProfileInput = {
      name: updates.name,
      phone: updates.phone,
      organization: updates.organization,
      location: updates.location,
      avatarUrl: updates.avatarUrl,
      farmerProfile: updates.farmerProfile,
      fpoProfile: updates.fpoProfile,
      buyerProfile: updates.buyerProfile,
      consumerProfile: updates.consumerProfile,
      logisticsProfile: updates.logisticsProfile,
      kisanId: updates.kisanId,
      fpoRegNumber: updates.fpoRegNumber,
      gstin: updates.gstin,
    };

    logger.info('Updating user profile', { uid: authUser.uid });
    return this.userRepo.updateProfile(existing.uid, sanitizedUpdates);
  }

  /**
   * Completes onboarding for a newly registered Firebase Auth user.
   * Enforces that ADMIN role cannot be self-assigned.
   */
  async onboard(authUser: AuthenticatedUser, input: OnboardingInput): Promise<ServerUserProfile> {
    // 1. Verify that profile does not already exist
    const existing = await this.userRepo.findByUid(authUser.uid);
    if (existing) {
      throw new ConflictError(
        'An application profile already exists for this authenticated user. Use PATCH /api/v1/users/me to update your profile.'
      );
    }

    // 1b. Enforce server-authoritative mobile number uniqueness
    if (input.phone) {
      const existingPhone = await this.userRepo.findByPhone(input.phone);
      if (existingPhone && existingPhone.uid !== authUser.uid) {
        throw new ConflictError(
          'An account is already registered with this mobile number. Please sign in instead.'
        );
      }
    }

    // 2. Canonicalize role and guard against administrative self-escalation
    const canonicalRole = normalizeRole(input.role);
    if (canonicalRole === 'admin') {
      logger.warn(`Security alert: Attempted admin role self-assignment by UID ${authUser.uid}`);
      throw new AuthorizationError(
        'Administrative roles cannot be self-assigned during onboarding. Contact the platform administrator.'
      );
    }

    // 3. Construct authoritative server user profile
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Resolve farmer land area
    let resolvedFarmerProfile = input.farmerProfile;
    if (resolvedFarmerProfile) {
      const acres = resolvedFarmerProfile.landHoldingAcres ?? resolvedFarmerProfile.landArea;
      resolvedFarmerProfile = {
        ...resolvedFarmerProfile,
        landHoldingAcres: acres,
      };
    }

    const defaultName =
      input.name ||
      input.email?.split('@')[0] ||
      authUser.email?.split('@')[0] ||
      (input.phone ? `User ${input.phone.replace(/\D/g, '').slice(-4)}` : 'Gramora Member');

    const profileData: Omit<ServerUserProfile, 'id' | 'uid' | 'createdAt' | 'updatedAt'> = {
      email: input.email || authUser.email || `${authUser.uid}@unverified.agrimarket.in`,
      role: canonicalRole,
      name: defaultName,
      phone: input.phone,
      organization: input.organization,
      location: input.location,
      avatarUrl: input.avatarUrl,
      verified: false,
      status: 'active',
      joinedDate: today,
      rating: 5.0,
      farmerProfile: resolvedFarmerProfile,
      fpoProfile: input.fpoProfile,
      buyerProfile: input.buyerProfile,
      consumerProfile: input.consumerProfile,
      logisticsProfile: input.logisticsProfile,
      kisanId: input.kisanId || resolvedFarmerProfile?.kisanId,
      fpoRegNumber: input.fpoRegNumber || input.fpoProfile?.fpoRegNumber,
      gstin: input.gstin || input.buyerProfile?.gstin,
    };

    logger.info('Creating authoritative user profile upon onboarding', {
      uid: authUser.uid,
      role: canonicalRole,
    });

    return this.userRepo.createProfile(authUser.uid, profileData);
  }

  /**
   * Admin-only: Retrieve user profile by UID.
   */
  async getUserById(uid: string): Promise<ServerUserProfile | null> {
    return this.userRepo.findByUid(uid);
  }
}

export const userService = new UserService();
