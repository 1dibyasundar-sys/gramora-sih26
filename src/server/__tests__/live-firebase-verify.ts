/**
 * LIVE FIREBASE CONNECTION & AUTHENTICATION VERIFICATION SCRIPT
 * Strictly tests live connectivity to Firebase Auth and Firestore.
 * NEVER prints API keys, client email, or private keys.
 */

import assert from 'node:assert/strict';
import { getServerConfig, isFirebaseAdminConfigured, getFirebaseAdminStatus } from '../config/env';
import { isFirebaseClientConfigured, getFirebaseClientConfig } from '../../lib/firebase/config';
import { getFirebaseAdminApp, getFirestore, getFirebaseAuth } from '../lib/firebase-admin';
import { getFirebaseClientApp, getFirebaseClientAuth } from '../../lib/firebase/client';
import { verifyTokenAndGetUser } from '../auth/verify-token';
import { requireRole, requireOwnershipOrAdmin } from '../auth/rbac';
import { userRepository } from '../repositories/user.repository';
import { userService } from '../services/user.service';
import { authService } from '../../services/auth/auth.service';
import { COLLECTIONS } from '../repositories/collections';

async function runLiveVerification() {
  console.log('====================================================');
  console.log('STARTING LIVE FIREBASE VERIFICATION SUITE');
  console.log('====================================================\n');

  // STEP 1: Verify Environment Variables
  console.log('STEP 1: Checking Environment Configuration...');
  const serverConfig = getServerConfig();
  const clientConfig = getFirebaseClientConfig();

  const clientConfigured = isFirebaseClientConfigured();
  const adminConfigured = isFirebaseAdminConfigured();
  const adminStatus = getFirebaseAdminStatus();

  assert.ok(clientConfigured, 'Client Firebase configuration must be valid');
  assert.ok(adminConfigured, 'Server Firebase Admin configuration must be valid');
  assert.equal(adminStatus, 'configured', 'Firebase Admin status must be "configured"');
  console.log('✔ PASS: Client and Server Firebase environment variables detected.');

  // STEP 2: Verify Mock Services Disabled
  console.log('\nSTEP 2: Verifying Mock Services Disabled...');
  const mockDisabled = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES === 'false';
  assert.ok(mockDisabled, 'NEXT_PUBLIC_USE_MOCK_SERVICES must be "false"');
  console.log('✔ PASS: Mock services explicitly disabled (NEXT_PUBLIC_USE_MOCK_SERVICES=false).');

  // STEP 3: Verify Project ID Consistency
  console.log('\nSTEP 3: Verifying Project ID Consistency...');
  assert.ok(clientConfig?.projectId, 'Client projectId must exist');
  assert.ok(serverConfig.FIREBASE_PROJECT_ID, 'Server FIREBASE_PROJECT_ID must exist');
  assert.equal(
    clientConfig?.projectId,
    serverConfig.FIREBASE_PROJECT_ID,
    'Client and Server Project IDs must match exactly'
  );
  console.log('✔ PASS: Client Project ID and Server Project ID match exactly.');

  // STEP 4: Verify Firebase Admin Initialization
  console.log('\nSTEP 4: Initializing Firebase Admin SDK...');
  const adminApp = getFirebaseAdminApp();
  assert.ok(adminApp, 'Firebase Admin App must initialize successfully');
  console.log('✔ PASS: Firebase Admin SDK initialized with real service account credentials.');

  // STEP 5: Verify Firestore Connectivity
  console.log('\nSTEP 5: Verifying Live Firestore Database Connectivity...');
  const db = getFirestore();
  assert.ok(db, 'Firestore instance must be accessible');

  // Perform a live write and read to users collection using a transient verification document
  const testUid = `sih-live-test-${Date.now()}`;
  const testDocRef = db.collection(COLLECTIONS.USERS).doc(testUid);

  await testDocRef.set({
    uid: testUid,
    role: 'farmer',
    name: 'Verification Test Producer',
    email: 'verification.test@smartagri.live',
    status: 'active',
    verified: true,
    joinedDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log('✔ PASS: Document write to Firestore collection "users" succeeded.');

  const snap = await testDocRef.get();
  assert.ok(snap.exists, 'Document must exist in Firestore');
  const docData = snap.data();
  assert.equal(docData?.uid, testUid);
  assert.equal(docData?.role, 'farmer');
  console.log('✔ PASS: Document read from Firestore collection "users" confirmed with matching UID.');

  // Clean up transient verification document
  await testDocRef.delete();
  console.log('✔ PASS: Verification document cleaned up from Firestore.');

  // STEP 6: Verify Firebase Authentication (Client & Server)
  console.log('\nSTEP 6: Verifying Live Firebase Authentication...');
  const authAdmin = getFirebaseAuth();
  assert.ok(authAdmin, 'Firebase Admin Auth instance must be accessible');

  // Create a live test user in Firebase Auth via Admin SDK
  const testAuthEmail = `sih.test.${Date.now()}@agrimarket.verify`;
  const testAuthPassword = 'VerifyPassword2026!#';

  const userRecord = await authAdmin.createUser({
    email: testAuthEmail,
    password: testAuthPassword,
    displayName: 'Live Verified Farmer',
  });

  const authUid = userRecord.uid;
  assert.ok(authUid, 'Created user must have a Firebase UID');
  console.log('✔ PASS: Live Firebase Auth user created successfully.');

  try {
    // Generate custom token and exchange for live ID token using client SDK or direct token verification
    // Since Firebase Client SDK signs in with email/password:
    const clientAuth = getFirebaseClientAuth();
    assert.ok(clientAuth, 'Firebase Client Auth instance must be available');

    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const userCredential = await signInWithEmailAndPassword(clientAuth, testAuthEmail, testAuthPassword);
    const idToken = await userCredential.user.getIdToken();
    assert.ok(idToken && idToken.length > 50, 'Must obtain a valid signed JWT ID token');
    console.log('✔ PASS: Firebase Client SDK signed in and obtained real JWT ID token.');

    // STEP 7: Verify Server-Side ID Token Verification
    console.log('\nSTEP 7: Verifying Server-Side ID Token Cryptographic Verification...');
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    assert.equal(decodedToken.uid, authUid, 'Decoded token UID must match authenticated UID');
    console.log('✔ PASS: Firebase Admin cryptographically verified live token and resolved UID.');

    // STEP 8: Verify Complete Onboarding Flow (POST /api/v1/users/onboard equivalent)
    console.log('\nSTEP 8: Verifying User Onboarding Flow...');
    const profile = await userService.onboard(
      {
        uid: authUid,
        email: testAuthEmail,
        role: 'farmer',
        name: 'Live Verified Farmer',
        verified: false,
        profileExists: false,
        status: 'pending_onboarding',
        claims: decodedToken,
      },
      {
        role: 'farmer',
        name: 'Live Verified Farmer',
        phone: '+91 98200 11223',
        location: {
          villageOrCity: 'Nashik Hub',
          district: 'Nashik',
          state: 'Maharashtra',
          pincode: '422001',
        },
        farmerProfile: {
          kisanId: 'MH-NSK-2026-LIVE',
          landHoldingAcres: 12.5,
        },
      }
    );

    assert.equal(profile.id, authUid, 'Profile ID must be Firebase UID');
    assert.equal(profile.uid, authUid, 'Profile UID must be Firebase UID');
    assert.equal(profile.role, 'farmer', 'Authoritative role must be farmer');
    console.log('✔ PASS: Onboarding created authoritative profile in Firestore at users/{uid}.');

    // STEP 9: Verify Server Profile Resolution (GET /api/v1/users/me equivalent)
    console.log('\nSTEP 9: Verifying Profile Resolution with verifyTokenAndGetUser...');
    const resolvedUser = await verifyTokenAndGetUser(idToken);
    assert.equal(resolvedUser.uid, authUid);
    assert.equal(resolvedUser.role, 'farmer');
    assert.equal(resolvedUser.profileExists, true);
    assert.equal(resolvedUser.status, 'active');
    console.log('✔ PASS: Server resolved authoritative Firestore profile from live token.');

    // STEP 10: Verify RBAC Enforcement on Live User
    console.log('\nSTEP 10: Verifying RBAC Authorization on Live User...');
    // Normal farmer satisfies farmer role
    assert.doesNotThrow(() => requireRole(resolvedUser, 'farmer'));
    // Normal farmer cannot satisfy admin role
    assert.throws(
      () => requireRole(resolvedUser, 'admin'),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
    console.log('✔ PASS: RBAC correctly grants farmer access and strictly rejects admin access.');

    // Verify ownership check
    assert.doesNotThrow(() => requireOwnershipOrAdmin(resolvedUser, authUid, 'product'));
    assert.throws(
      () => requireOwnershipOrAdmin(resolvedUser, 'other-users-product-uid', 'product'),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
    console.log('✔ PASS: Resource ownership check passes for own resource and denies other resources.');

    // Clean up profile in Firestore
    await db.collection(COLLECTIONS.USERS).doc(authUid).delete();
    console.log('✔ PASS: Test profile cleaned up from Firestore.');
  } finally {
    // Clean up user in Firebase Auth
    await authAdmin.deleteUser(authUid);
    console.log('✔ PASS: Test user cleaned up from Firebase Authentication.');
  }

  console.log('\n====================================================');
  console.log('ALL LIVE FIREBASE VERIFICATION CHECKS PASSED (10/10)!');
  console.log('====================================================\n');
}

runLiveVerification().catch((err) => {
  console.error('\n❌ LIVE FIREBASE VERIFICATION FAILED:', err.message || err);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
