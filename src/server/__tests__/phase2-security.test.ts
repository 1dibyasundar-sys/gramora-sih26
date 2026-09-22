/**
 * SMART AGRI MARKETPLACE — PHASE 2 SECURITY & AUTHENTICATION TESTS
 * Covers all 11 security verification requirements.
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getMeRoute, PATCH as patchMeRoute } from '@/app/api/v1/users/me/route';
import { POST as onboardRoute } from '@/app/api/v1/users/onboard/route';
import { UpdateProfileSchema, OnboardingSchema, ServerUserProfile } from '@/server/domain/user';
import { UserService } from '@/server/services/user.service';
import { UserRepository } from '@/server/repositories/user.repository';
import { extractBearerToken, AuthenticatedUser } from '@/server/auth/verify-token';
import { AuthenticationError, AuthorizationError, ConflictError, NotFoundError } from '@/server/lib/errors';
import { normalizeRole } from '@/types';

class MockInMemoryUserRepo extends UserRepository {
  private store = new Map<string, ServerUserProfile>();

  constructor() {
    super();
  }

  async findByUid(uid: string): Promise<ServerUserProfile | null> {
    return this.store.get(uid) || null;
  }

  async findById(id: string): Promise<ServerUserProfile | null> {
    return this.store.get(id) || null;
  }

  async findByPhone(rawPhone: string): Promise<ServerUserProfile | null> {
    const digits = rawPhone.replace(/\D/g, '').slice(-10);
    const profiles = Array.from(this.store.values());
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      if (profile.phone) {
        const profileDigits = profile.phone.replace(/\D/g, '').slice(-10);
        if (profileDigits === digits) {
          return profile;
        }
      }
    }
    return null;
  }

  async createProfile(
    uid: string,
    profileData: Omit<ServerUserProfile, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
  ): Promise<ServerUserProfile> {
    const now = new Date().toISOString();
    const full: ServerUserProfile = {
      ...profileData,
      id: uid,
      uid,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(uid, full);
    return full;
  }

  async updateProfile(
    uid: string,
    updates: Partial<Omit<ServerUserProfile, 'id' | 'uid' | 'createdAt' | 'updatedAt'>>
  ): Promise<ServerUserProfile> {
    const existing = this.store.get(uid);
    if (!existing) {
      throw new NotFoundError('users', uid);
    }
    const updated: ServerUserProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(uid, updated);
    return updated;
  }
}

async function runPhase2SecurityTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 2 SECURITY VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 11;

  // --------------------------------------------------------------------------
  // TEST 1: Unauthenticated GET /users/me -> 401
  // --------------------------------------------------------------------------
  {
    console.log('TEST 1: Unauthenticated GET /users/me -> 401');
    const req = new NextRequest('http://localhost:3000/api/v1/users/me');
    const res = await getMeRoute(req);
    assert.equal(res.status, 401, 'Expected status 401 for missing auth token');
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    assert.ok(res.headers.get('x-request-id'), 'Expected x-request-id header');
    console.log('✔ Passed: Unauthenticated request rejected with 401 and UNAUTHENTICATED error code.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Valid authenticated user -> profile returned
  // --------------------------------------------------------------------------
  {
    console.log('TEST 2: Valid authenticated user -> profile returned');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    await mockRepo.createProfile('test-uid-123', {
      email: 'farmer.test@ananya.agri',
      role: 'farmer',
      name: 'Ramesh Patel',
      verified: true,
      status: 'active',
      joinedDate: '2026-01-01',
    });

    const authUser: AuthenticatedUser = {
      uid: 'test-uid-123',
      email: 'farmer.test@ananya.agri',
      role: 'farmer',
      name: 'Ramesh Patel',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    const profile = await service.getMe(authUser);
    assert.equal(profile.uid, 'test-uid-123');
    assert.equal(profile.role, 'farmer');
    assert.equal(profile.name, 'Ramesh Patel');
    console.log('✔ Passed: Authoritative profile resolved for authenticated user.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: User cannot change UID
  // --------------------------------------------------------------------------
  {
    console.log('TEST 3: User cannot change UID');
    const maliciousPayload = {
      uid: 'hacked-victim-uid-999',
      id: 'hacked-victim-uid-999',
      name: 'Legit Name',
    };

    const parseResult = UpdateProfileSchema.safeParse(maliciousPayload);
    assert.equal(parseResult.success, false, 'Schema must reject privileged UID fields');
    if (!parseResult.success) {
      const issueKeys = parseResult.error.issues.map((i) => (i as any).keys || i.path).flat();
      console.log('Rejected unexpected/forbidden field keys:', issueKeys);
    }
    console.log('✔ Passed: UID tampering prevented by strict Zod schema validation.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: User cannot change role
  // --------------------------------------------------------------------------
  {
    console.log('TEST 4: User cannot change role');
    const maliciousRolePayload = {
      role: 'admin',
      name: 'Attacker Farmer',
    };

    const parseResult = UpdateProfileSchema.safeParse(maliciousRolePayload);
    assert.equal(parseResult.success, false, 'Schema must reject role field in profile update');
    console.log('✔ Passed: Role alteration blocked by strict profile update schema.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 5: User cannot inject arbitrary fields
  // --------------------------------------------------------------------------
  {
    console.log('TEST 5: User cannot inject arbitrary fields');
    const arbitraryPayload = {
      name: 'Valid Name',
      isAdmin: true,
      walletBalance: 9999999,
      internalNotes: 'bypass security',
    };

    const parseResult = UpdateProfileSchema.safeParse(arbitraryPayload);
    assert.equal(parseResult.success, false, 'Strict schema must reject undeclared fields');
    console.log('✔ Passed: Arbitrary field injection rejected.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Missing profile handled correctly (404)
  // --------------------------------------------------------------------------
  {
    console.log('TEST 6: Missing profile handled correctly');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    const unonboardedUser: AuthenticatedUser = {
      uid: 'unregistered-uid-777',
      email: 'newuser@firebase.mock',
      role: 'consumer',
      name: 'New Auth User',
      verified: false,
      profileExists: false,
      status: 'pending_onboarding',
      claims: {},
    };

    await assert.rejects(
      async () => {
        await service.getMe(unonboardedUser);
      },
      (err: any) => {
        assert.ok(err instanceof NotFoundError, 'Expected NotFoundError for pending onboarding');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
    console.log('✔ Passed: Missing profile correctly raises 404 NotFoundError.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 7: Admin profile can be resolved
  // --------------------------------------------------------------------------
  {
    console.log('TEST 7: Admin profile can be resolved');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    await mockRepo.createProfile('admin-uid-001', {
      email: 'admin@smartagri.gov.in',
      role: 'admin',
      name: 'National Agri Director',
      verified: true,
      status: 'active',
      joinedDate: '2026-01-01',
    });

    const adminAuthUser: AuthenticatedUser = {
      uid: 'admin-uid-001',
      email: 'admin@smartagri.gov.in',
      role: 'admin',
      name: 'National Agri Director',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: { admin: true },
    };

    const adminProfile = await service.getMe(adminAuthUser);
    assert.equal(adminProfile.role, 'admin');
    assert.equal(adminProfile.uid, 'admin-uid-001');
    console.log('✔ Passed: Admin profile resolved correctly.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 8: Invalid token rejected
  // --------------------------------------------------------------------------
  {
    console.log('TEST 8: Invalid token rejected');
    const req = new NextRequest('http://localhost:3000/api/v1/users/me', {
      headers: {
        authorization: 'Bearer invalid.fake.token.value',
      },
    });
    const res = await getMeRoute(req);
    assert.equal(res.status, 401, 'Expected status 401 for invalid token');
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    console.log('✔ Passed: Invalid token rejected with 401.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Malformed Authorization header rejected
  // --------------------------------------------------------------------------
  {
    console.log('TEST 9: Malformed Authorization header rejected');
    // Test 9a: Missing Bearer prefix
    const req1 = new NextRequest('http://localhost:3000/api/v1/users/me', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    assert.equal(extractBearerToken(req1), null, 'Basic auth should not extract as bearer token');
    const res1 = await getMeRoute(req1);
    assert.equal(res1.status, 401);

    // Test 9b: Empty token after Bearer
    const req2 = new NextRequest('http://localhost:3000/api/v1/users/me', {
      headers: { authorization: 'Bearer   ' },
    });
    assert.equal(extractBearerToken(req2), null, 'Whitespace-only bearer token must be null');
    const res2 = await getMeRoute(req2);
    assert.equal(res2.status, 401);

    console.log('✔ Passed: Malformed Authorization headers rejected.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 10: Cross-user profile access impossible through /users/me
  // --------------------------------------------------------------------------
  {
    console.log('TEST 10: Cross-user profile access impossible through /users/me');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    // Victim profile
    await mockRepo.createProfile('victim-uid-456', {
      email: 'victim@agrimarket.in',
      role: 'fpo',
      name: 'Victim FPO',
      verified: true,
      status: 'active',
      joinedDate: '2026-01-01',
    });

    // Attacker user
    const attackerAuthUser: AuthenticatedUser = {
      uid: 'attacker-uid-111',
      email: 'attacker@agrimarket.in',
      role: 'consumer',
      name: 'Attacker User',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };

    // Attacker profile
    await mockRepo.createProfile('attacker-uid-111', {
      email: 'attacker@agrimarket.in',
      role: 'consumer',
      name: 'Attacker User',
      verified: true,
      status: 'active',
      joinedDate: '2026-01-01',
    });

    // Even if attacker tries to pass victim UID in an update payload
    const maliciousPayload = {
      uid: 'victim-uid-456',
      name: 'Compromised Name',
    };

    assert.throws(() => {
      UpdateProfileSchema.parse(maliciousPayload);
    }, 'UpdateProfileSchema must reject any uid property');

    // UserService.getMe only looks up the authenticated user's token UID
    const profile = await service.getMe(attackerAuthUser);
    assert.equal(profile.uid, 'attacker-uid-111', 'Profile returned must match authenticated UID');
    assert.notEqual(profile.uid, 'victim-uid-456', 'Attacker cannot access victim profile');

    console.log('✔ Passed: Cross-user access impossible; identity anchored strictly in token.\n');
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TEST 11: Role self-escalation impossible (onboarding as admin rejected)
  // --------------------------------------------------------------------------
  {
    console.log('TEST 11: Role self-escalation impossible');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    const normalUser: AuthenticatedUser = {
      uid: 'new-farmer-uid-555',
      email: 'newfarmer@agrimarket.in',
      role: 'consumer',
      name: 'Farmer John',
      verified: false,
      profileExists: false,
      status: 'pending_onboarding',
      claims: {},
    };

    // Attempt 1: Via OnboardingSchema
    const escalationAttempt = {
      role: 'admin',
      name: 'Escalator',
    };

    const parseResult = OnboardingSchema.safeParse(escalationAttempt);
    assert.equal(parseResult.success, false, 'OnboardingSchema must disallow admin role');

    // Attempt 2: Via UserService.onboard
    await assert.rejects(
      async () => {
        await service.onboard(normalUser, {
          role: 'admin' as any,
          name: 'Escalator',
        });
      },
      (err: any) => {
        assert.ok(err instanceof AuthorizationError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Legitimate onboarding succeeds
    const onboarded = await service.onboard(normalUser, {
      role: 'farmer',
      name: 'Farmer John',
    });
    assert.equal(onboarded.role, 'farmer');
    assert.equal(onboarded.status, 'active');

    // Second onboarding attempt causes ConflictError (409)
    await assert.rejects(
      async () => {
        await service.onboard(normalUser, {
          role: 'farmer',
          name: 'Farmer John Again',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    console.log('✔ Passed: Role self-escalation and duplicate onboarding prevented.\n');
    passedTests++;
  }

  console.log('====================================================');
  console.log(`ALL ${passedTests}/${totalTests} PHASE 2 SECURITY TESTS PASSED!`);
  console.log('====================================================\n');
}

runPhase2SecurityTests().catch((err) => {
  console.error('TEST SUITE FAILURE:', err);
  process.exit(1);
});
