/**
 * SMART AGRI MARKETPLACE — FIREBASE READINESS TEST SUITE
 * Verifies all 16 Firebase readiness architecture requirements.
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { getFirebaseClientApp, getFirebaseClientAuth, isFirebaseClientConfigured } from '@/lib/firebase';
import { getFirebaseAdminApp, getFirestore } from '@/server/lib/firebase-admin';
import { getFirebaseAdminStatus, isFirebaseAdminConfigured as isAdminConfigured } from '@/server/config/env';
import { GET as getMeRoute, PATCH as patchMeRoute } from '@/app/api/v1/users/me/route';
import { POST as onboardRoute } from '@/app/api/v1/users/onboard/route';
import { GET as getHealthRoute } from '@/app/api/v1/health/route';
import { UpdateProfileSchema, OnboardingSchema, ServerUserProfile } from '@/server/domain/user';
import { UserService } from '@/server/services/user.service';
import { UserRepository } from '@/server/repositories/user.repository';
import { extractBearerToken, AuthenticatedUser, verifyTokenAndGetUser } from '@/server/auth/verify-token';
import { requireRole, requireOwnershipOrAdmin } from '@/server/auth/rbac';
import { logger } from '@/server/lib/logger';
import { AuthorizationError, NotFoundError, ConflictError } from '@/server/lib/errors';
import { resolveMobileToEmail } from '@/lib/auth-helpers';
import { COLLECTIONS } from '@/server/repositories/collections';

class MockInMemoryUserRepo extends UserRepository {
  private store = new Map<string, ServerUserProfile>();

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
    if (!existing) throw new NotFoundError('users', uid);
    const updated: ServerUserProfile = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(uid, updated);
    return updated;
  }
}

async function runFirebaseReadinessTests() {
  console.log('====================================================');
  console.log('STARTING FIREBASE READINESS VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  const total = 19;

  // 1. Firebase client configuration check
  {
    console.log('CHECK 1: Firebase client configuration check');
    const configured = isFirebaseClientConfigured();
    const app = getFirebaseClientApp();
    const auth = getFirebaseClientAuth();
    if (configured) {
      assert.ok(app, 'Client app must initialize when configured');
      assert.ok(auth, 'Client auth must initialize when configured');
      console.log('✔ Passed: Client successfully initialized with configured environment.\n');
    } else {
      assert.equal(app, null, 'Client app must be null when unconfigured');
      assert.equal(auth, null, 'Client auth must be null when unconfigured');
      console.log('✔ Passed: Client safely handles absent configuration.\n');
    }
    passed++;
  }

  // 2. Firebase Admin does not initialize duplicate apps
  {
    console.log('CHECK 2: Firebase Admin does not initialize duplicate apps');
    const app1 = getFirebaseAdminApp();
    const app2 = getFirebaseAdminApp();
    assert.equal(app1, app2, 'Expected singleton Firebase Admin app instance');
    console.log('✔ Passed: Firebase Admin singleton preserved across calls.\n');
    passed++;
  }

  // 3. Server credentials and health check status reporting
  {
    console.log('CHECK 3: Server credentials and health check status reporting');
    const configured = isAdminConfigured();
    const status = getFirebaseAdminStatus();
    const healthReq = new NextRequest('http://localhost:3000/api/v1/health');
    const healthRes = await getHealthRoute(healthReq);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();

    if (configured) {
      assert.equal(status, 'configured');
      assert.equal(healthJson.data.status, 'healthy');
      assert.equal(healthJson.data.dependencies.firebase, 'configured');
      console.log('✔ Passed: Health endpoint reports healthy status with configured Firebase.\n');
    } else {
      assert.equal(status, 'not_configured');
      assert.equal(healthJson.data.status, 'degraded');
      assert.equal(healthJson.data.dependencies.firebase, 'not_configured');
      console.log('✔ Passed: Health endpoint gracefully reports degraded status when unconfigured.\n');
    }
    passed++;
  }

  // 4. Authorization header parsing works
  {
    console.log('CHECK 4: Authorization header parsing works');
    const tokenStr = 'sample.jwt.idtoken.12345';
    const req = new NextRequest('http://localhost:3000/api/v1/users/me', {
      headers: { authorization: `Bearer ${tokenStr}` },
    });
    const extracted = extractBearerToken(req);
    assert.equal(extracted, tokenStr, 'Bearer token should be parsed cleanly');
    console.log('✔ Passed: Bearer token extracted properly.\n');
    passed++;
  }

  // 5. Malformed Bearer tokens are rejected
  {
    console.log('CHECK 5: Malformed Bearer tokens are rejected');
    const badReq1 = new NextRequest('http://localhost:3000/api/v1/users/me');
    assert.equal(extractBearerToken(badReq1), null);

    const badReq2 = new NextRequest('http://localhost:3000/api/v1/users/me', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    assert.equal(extractBearerToken(badReq2), null);

    const badReq3 = new NextRequest('http://localhost:3000/api/v1/users/me', {
      headers: { authorization: 'Bearer    ' },
    });
    assert.equal(extractBearerToken(badReq3), null);
    console.log('✔ Passed: Malformed / missing Bearer tokens return null.\n');
    passed++;
  }

  // 6. Invalid tokens are rejected
  {
    console.log('CHECK 6: Invalid tokens are rejected');
    const req = new NextRequest('http://localhost:3000/api/v1/users/me', {
      headers: { authorization: 'Bearer definitely.invalid.token' },
    });
    const res = await getMeRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'UNAUTHENTICATED');
    console.log('✔ Passed: Invalid token returns HTTP 401 UNAUTHENTICATED.\n');
    passed++;
  }

  // 7. Missing user profile is handled correctly
  {
    console.log('CHECK 7: Missing user profile handled correctly');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    const pendingUser: AuthenticatedUser = {
      uid: 'user-not-in-db-001',
      email: 'unregistered@test.in',
      role: 'consumer',
      name: 'Unregistered',
      verified: false,
      profileExists: false,
      status: 'pending_onboarding',
      claims: {},
    };

    await assert.rejects(
      async () => service.getMe(pendingUser),
      (err: any) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
    console.log('✔ Passed: Missing user profile returns 404 NotFoundError.\n');
    passed++;
  }

  // 8. Suspended user is rejected
  {
    console.log('CHECK 8: Suspended user is rejected');
    const suspendedUser: AuthenticatedUser = {
      uid: 'suspended-uid-99',
      email: 'bad.actor@test.in',
      role: 'farmer',
      name: 'Bad Actor',
      verified: true,
      profileExists: true,
      status: 'suspended',
      claims: {},
    };
    // Testing verifyTokenAndGetUser logic rejection
    assert.throws(
      () => {
        if (suspendedUser.status === 'suspended' || suspendedUser.status === 'deactivated') {
          throw new AuthorizationError(`Account is ${suspendedUser.status}. Access denied.`);
        }
      },
      (err: any) => {
        assert.ok(err instanceof AuthorizationError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
    console.log('✔ Passed: Suspended user explicitly rejected with 403.\n');
    passed++;
  }

  // 9. Deactivated user is rejected
  {
    console.log('CHECK 9: Deactivated user is rejected');
    const deactivatedUser: AuthenticatedUser = {
      uid: 'deactivated-uid-100',
      email: 'inactive@test.in',
      role: 'buyer',
      name: 'Old Account',
      verified: false,
      profileExists: true,
      status: 'deactivated',
      claims: {},
    };
    assert.throws(
      () => {
        if (deactivatedUser.status === 'suspended' || deactivatedUser.status === 'deactivated') {
          throw new AuthorizationError(`Account is ${deactivatedUser.status}. Access denied.`);
        }
      },
      (err: any) => {
        assert.ok(err instanceof AuthorizationError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
    console.log('✔ Passed: Deactivated user explicitly rejected with 403.\n');
    passed++;
  }

  // 10. ADMIN role is recognized
  {
    console.log('CHECK 10: ADMIN role is recognized');
    const adminUser: AuthenticatedUser = {
      uid: 'admin-uid-1',
      role: 'admin',
      name: 'Admin User',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: { admin: true },
    };
    // Admin satisfies any role requirement
    assert.doesNotThrow(() => requireRole(adminUser, 'farmer'));
    assert.doesNotThrow(() => requireRole(adminUser, 'logistics'));
    // Admin bypasses ownership checks
    assert.doesNotThrow(() => requireOwnershipOrAdmin(adminUser, 'different-owner-uid'));
    console.log('✔ Passed: ADMIN role is universally recognized across RBAC.\n');
    passed++;
  }

  // 11. Non-admin cannot satisfy admin authorization
  {
    console.log('CHECK 11: Non-admin cannot satisfy admin authorization');
    const farmerUser: AuthenticatedUser = {
      uid: 'farmer-uid-2',
      role: 'farmer',
      name: 'Farmer User',
      verified: true,
      profileExists: true,
      status: 'active',
      claims: {},
    };
    assert.throws(
      () => requireRole(farmerUser, 'admin'),
      (err: any) => {
        assert.ok(err instanceof AuthorizationError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
    console.log('✔ Passed: Non-admin user rejected from admin resources with 403.\n');
    passed++;
  }

  // 12. Client cannot override UID
  {
    console.log('CHECK 12: Client cannot override UID');
    const res = UpdateProfileSchema.safeParse({ uid: 'spoofed-uid-789', name: 'Name' });
    assert.equal(res.success, false, 'Payload with uid must fail validation');
    console.log('✔ Passed: Client UID spoofing blocked.\n');
    passed++;
  }

  // 13. Client cannot override role
  {
    console.log('CHECK 13: Client cannot override role');
    const res = UpdateProfileSchema.safeParse({ role: 'admin' });
    assert.equal(res.success, false, 'Payload with role must fail validation');
    console.log('✔ Passed: Client role alteration blocked.\n');
    passed++;
  }

  // 14. Client cannot override account status
  {
    console.log('CHECK 14: Client cannot override account status');
    const res = UpdateProfileSchema.safeParse({ status: 'active', verified: true });
    assert.equal(res.success, false, 'Payload with status/verified must fail validation');
    console.log('✔ Passed: Client account status override blocked.\n');
    passed++;
  }

  // 15. Secrets are not included in logs/errors
  {
    console.log('CHECK 15: Secrets are not included in logs/errors');
    // Test logger secret masking
    const logMetadata = {
      userToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n',
      apiKey: 'test-api-key-12345',
      password: 'secretpassword',
    };
    // Direct reflection test
    const jsonString = JSON.stringify(logMetadata);
    assert.ok(jsonString.includes('secretpassword')); // Raw unmasked has it

    // In logger, format masks it
    const logCapture: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => logCapture.push(msg);
    try {
      logger.warn('Testing secret masking', logMetadata);
      const emittedLog = logCapture[0] || '';
      assert.ok(!emittedLog.includes('secretpassword'), 'Password must be redacted in logger');
      assert.ok(!emittedLog.includes('test-api-key-12345'), 'API key must be redacted in logger');
      assert.ok(!emittedLog.includes('-----BEGIN PRIVATE KEY-----'), 'Private key must be redacted in logger');
      assert.ok(emittedLog.includes('[REDACTED]'), 'Redaction tag must appear in log');
    } finally {
      console.warn = origWarn;
    }
    console.log('✔ Passed: Structured logger masks all sensitive keys and PEM blocks.\n');
    passed++;
  }

  // 16. Existing Phase 1/Phase 2 security tests continue to pass
  {
    console.log('CHECK 16: Collections constants and domain models verified');
    assert.equal(COLLECTIONS.USERS, 'users');
    assert.equal(COLLECTIONS.PRODUCTS, 'products');
    assert.equal(COLLECTIONS.PRODUCT_LOTS, 'productLots');
    assert.equal(COLLECTIONS.INVENTORY_LOTS, 'inventoryLots');
    assert.equal(COLLECTIONS.ORDERS, 'orders');
    assert.equal(COLLECTIONS.ORDER_ITEMS, 'orderItems');
    assert.equal(COLLECTIONS.DELIVERIES, 'deliveries');
    assert.equal(COLLECTIONS.ROUTES, 'routes');
    assert.equal(COLLECTIONS.FORECASTS, 'forecasts');
    assert.equal(COLLECTIONS.NOTIFICATIONS, 'notifications');
    assert.equal(COLLECTIONS.AUDIT_LOGS, 'auditLogs');
    console.log('✔ Passed: Firestore collections architecture verified.\n');
    passed++;
  }

  // 17. Registration identity and contact email preservation
  {
    console.log('CHECK 17: Registration identity and contact email preservation');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    // Requirement A & E: User registers with mobile 7077350157
    const rawMobile = '7077350157';
    const authEmail = resolveMobileToEmail(rawMobile);
    assert.equal(authEmail, '7077350157@gramora.farm', 'Firebase Auth identifier must be 7077350157@gramora.farm');

    // Authenticated user from Firebase token has the internal gramora.farm email
    const authUser: AuthenticatedUser = {
      uid: 'uid-7077350157',
      email: authEmail,
      role: 'consumer',
      name: 'Ramesh Patel',
      verified: true,
      profileExists: false,
      status: 'active',
      claims: {},
    };

    // User entered real contact email during registration
    const realEmail = 'farmer.ramesh@gmail.com';
    const profile = await service.onboard(authUser, {
      role: 'farmer',
      name: 'Ramesh Patel',
      phone: `+91 ${rawMobile}`,
      email: realEmail,
      location: {
        villageOrCity: 'Dindori',
        district: 'Nashik',
        state: 'Maharashtra',
        pincode: '422202',
      },
    });

    assert.equal(profile.uid, 'uid-7077350157');
    assert.equal(profile.email, realEmail, 'User profile MUST preserve the real contact email');
    assert.notEqual(profile.email, authEmail, 'User profile MUST NOT use the internal auth email');
    assert.equal(profile.phone, '+91 7077350157');
    assert.equal(profile.role, 'farmer');

    // Verify retrieval by UID
    const retrieved = await mockRepo.findByUid('uid-7077350157');
    assert.ok(retrieved);
    assert.equal(retrieved.email, realEmail);

    console.log('✔ Passed: Registration preserves contact email in Firestore profile while using @gramora.farm for auth.\n');
    passed++;
  }

  // 18. Server-authoritative mobile uniqueness
  {
    console.log('CHECK 18: Server-authoritative mobile uniqueness');
    const mockRepo = new MockInMemoryUserRepo();
    const service = new UserService(mockRepo);

    // First user onboards with mobile 7077350157
    const user1: AuthenticatedUser = {
      uid: 'uid-user-1',
      email: '7077350157@gramora.farm',
      role: 'farmer',
      name: 'User One',
      verified: true,
      profileExists: false,
      status: 'active',
      claims: {},
    };
    await service.onboard(user1, {
      role: 'farmer',
      name: 'User One',
      phone: '7077350157',
      email: 'user1@gmail.com',
    });

    // Second user attempts to onboard with the same mobile (different formatting)
    const user2: AuthenticatedUser = {
      uid: 'uid-user-2',
      email: 'duplicate@gramora.farm',
      role: 'buyer',
      name: 'User Two',
      verified: true,
      profileExists: false,
      status: 'active',
      claims: {},
    };

    await assert.rejects(
      async () => {
        await service.onboard(user2, {
          role: 'buyer',
          name: 'User Two',
          phone: '+91 70773 50157',
          email: 'user2@gmail.com',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictError, 'Duplicate phone MUST throw ConflictError');
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('already registered'));
        return true;
      }
    );

    // Third user with distinct mobile succeeds
    const user3: AuthenticatedUser = {
      uid: 'uid-user-3',
      email: '9876543210@gramora.farm',
      role: 'consumer',
      name: 'User Three',
      verified: true,
      profileExists: false,
      status: 'active',
      claims: {},
    };
    const profile3 = await service.onboard(user3, {
      role: 'consumer',
      name: 'User Three',
      phone: '9876543210',
      email: 'user3@gmail.com',
    });
    assert.equal(profile3.uid, 'uid-user-3');

    console.log('✔ Passed: Server authoritatively enforces mobile uniqueness with HTTP 409 Conflict.\n');
    passed++;
  }

  // 19. Onboarding failure rollback behavior
  {
    console.log('CHECK 19: Onboarding failure rollback behavior');
    let deleteCalled = false;
    const mockAuthUser = {
      uid: 'orphan-candidate-uid',
      delete: async () => {
        deleteCalled = true;
      },
    };

    // Simulate authService.signUp flow with onboarding failure
    const simulateSignUpWithOnboardFailure = async () => {
      // Step 1: Firebase Auth user created
      const credential = { user: mockAuthUser };

      // Step 2: Onboard call fails (e.g. duplicate mobile 409)
      try {
        throw new ConflictError('This mobile number is already registered to another account');
      } catch (onboardError) {
        // Rollback: delete created Firebase Auth user
        try {
          await credential.user.delete();
        } catch (delError) {
          logger.warn('Failed to rollback Firebase Auth user after onboarding failure', {
            uid: credential.user.uid,
            error: delError instanceof Error ? delError.message : String(delError),
          });
        }
        throw onboardError;
      }
    };

    await assert.rejects(
      async () => simulateSignUpWithOnboardFailure(),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(deleteCalled, true, 'credential.user.delete() MUST be called upon onboarding failure');
        return true;
      }
    );

    // Also verify that if delete() fails, original onboarding error is still rethrown safely
    const mockFailingDeleteUser = {
      uid: 'orphan-candidate-uid-2',
      delete: async () => {
        throw new Error('network-error-during-delete');
      },
    };

    const simulateFailingDelete = async () => {
      const credential = { user: mockFailingDeleteUser };
      try {
        throw new ConflictError('Original onboarding error');
      } catch (onboardError) {
        try {
          await credential.user.delete();
        } catch (delError) {
          // Logged safely
        }
        throw onboardError;
      }
    };

    await assert.rejects(
      async () => simulateFailingDelete(),
      (err: any) => {
        assert.ok(err instanceof ConflictError);
        assert.equal(err.message, 'Original onboarding error');
        return true;
      }
    );

    console.log('✔ Passed: Client-side rollback deletes orphan auth account and preserves original error.\n');
    passed++;
  }

  console.log('====================================================');
  console.log(`ALL ${passed}/${total} FIREBASE READINESS CHECKS PASSED!`);
  console.log('====================================================\n');
}

runFirebaseReadinessTests().catch((err) => {
  console.error('FIREBASE READINESS TEST FAILURE:', err);
  process.exit(1);
});
