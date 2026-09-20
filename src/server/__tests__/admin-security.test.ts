import assert from 'node:assert';
import { adminService } from '../services/admin.service';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { userRepository } from '../repositories/user.repository';
import { productRepository } from '../repositories/product.repository';
import { orderRepository } from '../repositories/order.repository';
import { AuthenticatedUser } from '../auth/verify-token';
import { requireRole } from '../auth/rbac';
import { normalizeRole } from '@/types';

console.log('====================================================');
console.log('STARTING ADMIN SECURITY & RBAC AUTHORIZATION TEST SUITE');
console.log('====================================================');

const testAdminUser: AuthenticatedUser = {
  uid: 'admin-root-security-test',
  email: 'admin@gramora.in',
  role: 'admin',
  name: 'Gramora Chief Administrator',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: { role: 'admin' },
};

const testFarmerUser: AuthenticatedUser = {
  uid: 'farmer-security-test',
  email: 'farmer@gramora.in',
  role: 'farmer',
  name: 'Kisan Ramesh',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: { role: 'farmer' },
};

const testBuyerUser: AuthenticatedUser = {
  uid: 'buyer-security-test',
  email: 'buyer@gramora.in',
  role: 'buyer',
  name: 'AgriRetail Co.',
  verified: true,
  profileExists: true,
  status: 'active',
  claims: { role: 'buyer' },
};

async function runAdminSecurityTests() {
  // Setup: create test admin user profile in Firestore so target role checks function accurately
  await userRepository.createProfile(testAdminUser.uid, {
    email: 'admin@gramora.in',
    role: 'admin',
    name: testAdminUser.name,
    phone: '9876543200',
    verified: true,
    status: 'active',
    joinedDate: '2026-03-20',
    location: { district: 'Central', state: 'Delhi', villageOrCity: 'New Delhi', pincode: '110001' },
    rating: 5,
  });

  // TEST 1: Strict RBAC Barrier on Admin Role
  console.log('\nTEST 1: Server-side RBAC barrier rejects non-admin roles');
  assert.throws(
    () => requireRole(testFarmerUser, 'admin'),
    (err: any) => err.statusCode === 403,
    'Farmer role must be rejected with 403 FORBIDDEN when attempting admin access'
  );
  assert.throws(
    () => requireRole(testBuyerUser, 'admin'),
    (err: any) => err.statusCode === 403,
    'Buyer role must be rejected with 403 FORBIDDEN when attempting admin access'
  );
  assert.doesNotThrow(
    () => requireRole(testAdminUser, 'admin'),
    'Admin role must successfully pass admin role check'
  );
  console.log('✔ Passed: 403 FORBIDDEN enforced on unauthorized roles.');

  // TEST 2: Real Database Platform Metrics Computation
  console.log('\nTEST 2: Authoritative dashboard metrics calculation from real Firestore data');
  const metrics = await adminService.getDashboardMetrics();
  assert.ok(typeof metrics.users.total === 'number', 'Total users must be a valid number');
  assert.ok(typeof metrics.products.total === 'number', 'Total products must be a valid number');
  assert.ok(typeof metrics.orders.total === 'number', 'Total orders must be a valid number');
  assert.ok(typeof metrics.orders.totalGmvPaise === 'number', 'GMV paise must be a valid number');
  assert.ok(typeof metrics.orders.totalGmvRupees === 'number', 'GMV rupees must be a valid number');
  assert.ok(metrics.systemHealth.database === 'healthy', 'Database must be reported as healthy');
  console.log(
    `✔ Passed: Computed metrics — Users: ${metrics.users.total} (${metrics.users.farmers} farmers, ${metrics.users.fpos} FPOs, ${metrics.users.buyers} buyers), Products: ${metrics.products.total}, Orders: ${metrics.orders.total}, GMV: ₹${metrics.orders.totalGmvRupees}.`
  );

  // TEST 3: Admin User Verification Command & Audit Log
  console.log('\nTEST 3: Admin user verification decision records immutable audit entry');
  // Create a temporary test user profile in Firestore
  const testTargetUid = `temp-user-${Date.now()}`;
  await userRepository.createProfile(testTargetUid, {
    email: `${testTargetUid}@test.in`,
    role: 'farmer',
    name: 'Verification Candidate Farmer',
    phone: '9876543210',
    verified: false,
    status: 'active',
    joinedDate: '2026-03-20',
    location: { district: 'Nashik', state: 'Maharashtra', villageOrCity: 'Dindori', pincode: '422001' },
    rating: 5,
  });

  const verifyReqId = `req-verify-${Date.now()}`;
  const verifiedProfile = await adminService.verifyUser(
    testAdminUser,
    testTargetUid,
    { verified: true, reason: 'Verified land title and Kisan ID credentials' },
    verifyReqId
  );
  assert.strictEqual(verifiedProfile.verified, true, 'User profile must be marked verified');

  // Verify that an audit record was written to COLLECTIONS.AUDIT_LOGS
  const auditLogs = await auditLogRepository.findByTarget(testTargetUid);
  assert.ok(auditLogs.length > 0, 'Audit log entry must be created in auditLogs collection');
  const verifyEntry = auditLogs.find((l) => l.action === 'user:verify');
  assert.ok(verifyEntry, 'Audit log must contain user:verify action');
  assert.strictEqual(verifyEntry.actorUid, testAdminUser.uid, 'Audit log must record admin UID');
  assert.strictEqual(verifyEntry.targetId, testTargetUid, 'Audit log must record target user UID');
  assert.strictEqual(verifyEntry.requestId, verifyReqId, 'Audit log must link request ID');
  console.log('✔ Passed: Verification state updated and audit log entry created.');

  // TEST 4: Admin User Account Status Change (Suspension) & Audit Log
  console.log('\nTEST 4: Admin user suspension command records audit log entry');
  const suspendReqId = `req-suspend-${Date.now()}`;
  const suspendedProfile = await adminService.setUserStatus(
    testAdminUser,
    testTargetUid,
    { status: 'suspended', reason: 'Regulatory compliance review pending' },
    suspendReqId
  );
  assert.strictEqual(suspendedProfile.status, 'suspended', 'User profile status must be suspended');

  const statusLogs = await auditLogRepository.findByTarget(testTargetUid);
  const statusEntry = statusLogs.find((l) => l.action === 'user:status_change');
  assert.ok(statusEntry, 'Audit log must contain user:status_change action');
  assert.strictEqual(statusEntry.details?.newStatus, 'suspended');
  console.log('✔ Passed: User account status successfully mutated with audit trail.');

  // TEST 5: Protection Against Suspending Administrator Accounts (self and others)
  console.log('\nTEST 5: Admin cannot suspend another administrator account or their own account');
  const anotherAdminUid = `admin-second-${Date.now()}`;
  await userRepository.createProfile(anotherAdminUid, {
    email: 'admin2@gramora.in',
    role: 'admin',
    name: 'Secondary Admin',
    phone: '9876543211',
    verified: true,
    status: 'active',
    joinedDate: '2026-03-20',
    location: { district: 'Central', state: 'Delhi', villageOrCity: 'New Delhi', pincode: '110001' },
    rating: 5,
  });

  // 5a: Another admin
  await assert.rejects(
    async () => {
      await adminService.setUserStatus(
        testAdminUser,
        anotherAdminUid,
        { status: 'suspended', reason: 'Attempting unsafe admin lockout' },
        'req-unsafe'
      );
    },
    (err: any) => err.statusCode === 403,
    'Attempting to suspend another administrator must throw 403 FORBIDDEN'
  );

  // 5b: Self-suspension
  await assert.rejects(
    async () => {
      await adminService.setUserStatus(
        testAdminUser,
        testAdminUser.uid,
        { status: 'suspended', reason: 'Self-lockout attempt' },
        'req-self'
      );
    },
    (err: any) => err.statusCode === 403,
    'Attempting to suspend own administrator account must throw 403 FORBIDDEN'
  );
  console.log('✔ Passed: Administrator account lockout protection verified (both self and other admins).');

  // 5c: Audit Log Sanitization
  console.log('\nTEST 5c: Audit Log sanitizes sensitive keys automatically');
  const testAuditEntry = await auditLogRepository.record({
    actorUid: testAdminUser.uid,
    actorRole: 'admin',
    action: 'test:sanitize',
    targetType: 'system',
    targetId: 'sys-001',
    requestId: 'req-san',
    details: {
      password: 'super_secret_password',
      apiKey: 'secret_api_key_value',
      token: 'bearer_token_12345',
      normalField: 'safe_value',
    },
  });
  assert.strictEqual(testAuditEntry.details?.password, '[REDACTED]', 'Password must be redacted');
  assert.strictEqual(testAuditEntry.details?.apiKey, '[REDACTED]', 'API key must be redacted');
  assert.strictEqual(testAuditEntry.details?.token, '[REDACTED]', 'Token must be redacted');
  assert.strictEqual(testAuditEntry.details?.normalField, 'safe_value', 'Normal fields must be preserved');
  console.log('✔ Passed: Sensitive credential redaction in audit logs verified.');

  // TEST 6: Admin Product Moderation & Audit Log
  console.log('\nTEST 6: Admin product listing moderation records audit log');
  // Create a temporary product in Firestore
  const testProduct = await productRepository.create({
    sellerId: testTargetUid,
    sellerName: 'Verification Candidate Farmer',
    sellerType: 'farmer',
    sellerRating: 5,
    sellerVerified: true,
    title: 'Audit Inspection Harvest Wheat',
    category: 'grains',
    variety: 'Sharbati',
    pricePerUnit: 34,
    pricePerUnitPaise: 3400,
    unit: 'kg',
    marketMandiPrice: 42,
    minOrderQuantity: 50,
    totalAvailableQuantity: 500,
    listingStatus: 'active',
    location: { district: 'Nashik', state: 'Maharashtra' },
    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea'],
    harvestDate: '2026-03-20',
    shelfLifeDays: 90,
    qualityGrade: 'Grade A',
    storageType: 'Ambient Warehouse',
    description: 'Fresh crop batch for administrative audit testing',
    organicCertified: true,
    tags: ['Wheat', 'Premium'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const moderateReqId = `req-mod-${Date.now()}`;
  const moderated = await adminService.moderateProduct(
    testAdminUser,
    testProduct.id,
    { listingStatus: 'paused', reason: 'Inspection of lot packaging standard' },
    moderateReqId
  );
  assert.strictEqual(moderated.listingStatus, 'paused', 'Product listingStatus must be updated to paused');

  const prodLogs = await auditLogRepository.findByTarget(testProduct.id);
  const modEntry = prodLogs.find((l) => l.action === 'product:moderate');
  assert.ok(modEntry, 'Audit log must record product:moderate action');
  assert.strictEqual(modEntry.details?.newStatus, 'paused');
  console.log('✔ Passed: Product moderated and audit trail verified.');

  // TEST 7: Clean Up Temporary Test Records
  console.log('\nTEST 7: Cleaning up test artifacts from database');
  await userRepository.delete(testTargetUid);
  await userRepository.delete(anotherAdminUid);
  await userRepository.delete(testAdminUser.uid);
  await productRepository.delete(testProduct.id);
  console.log('✔ Passed: Test artifacts cleanly removed.');

  console.log('\n====================================================');
  console.log('ALL 7/7 ADMIN SECURITY & RBAC TESTS PASSED!');
  console.log('====================================================\n');
}

runAdminSecurityTests().catch((err) => {
  console.error('❌ Admin security test failure:', err);
  process.exit(1);
});
