/**
 * LIVE CLOUDINARY SMOKE & SECURITY VERIFICATION SUITE
 * SIH 2026 | PS 26033 | Team: 6 Minds
 * 
 * Performs real, controlled Cloudinary live operations with real credentials.
 * NEVER prints API keys, secrets, or tokens.
 */

import assert from 'node:assert/strict';
import { isCloudinaryConfigured, getCloudinaryConfig } from '../config/env';
import {
  createUploadSignature,
  destroyCloudinaryAsset,
  assertAssetOwnership,
  getDeterministicFolder,
} from '../lib/cloudinary';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import { getFirebaseAdminApp, getFirestore, getFirebaseAuth } from '../lib/firebase-admin';
import { getFirebaseClientAuth } from '../../lib/firebase/client';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { verifyTokenAndGetUser, AuthenticatedUser } from '../auth/verify-token';
import { productRepository } from '../repositories/product.repository';
import { userRepository } from '../repositories/user.repository';

console.log('====================================================');
console.log('STARTING REAL CLOUDINARY LIVE CONNECTION & SMOKE TEST');
console.log('====================================================\n');

async function runLiveCloudinaryVerification() {
  // STEP 1: Verify Cloudinary Runtime Configuration Loads
  console.log('STEP 1: Verifying Cloudinary configuration loading from runtime environment...');
  assert.ok(isCloudinaryConfigured(), 'isCloudinaryConfigured() must return true');
  const cloudConfig = getCloudinaryConfig();
  assert.ok(cloudConfig.cloudName && cloudConfig.cloudName.length > 0, 'Cloud name must be present');
  assert.ok(cloudConfig.apiKey && cloudConfig.apiKey.length > 0, 'API key must be present');
  assert.ok(cloudConfig.apiSecret && cloudConfig.apiSecret.length > 0, 'API secret must be present');
  console.log('✔ PASS: Cloudinary credentials loaded successfully from runtime environment (values protected).');

  // STEP 2: Live Firebase Authentication
  console.log('\nSTEP 2: Authenticating real test farmer via Firebase Auth...');
  const adminAuth = getFirebaseAuth();
  const testEmail = `cloudinary.live.${Date.now()}@gramora.in`;
  const testPassword = 'CloudinaryPass2026!#';

  const userRecord = await adminAuth.createUser({
    email: testEmail,
    password: testPassword,
    displayName: 'Cloudinary Live Tester',
  });
  const farmerUid = userRecord.uid;

  // Create authoritative profile in Firestore
  await userRepository.createProfile(farmerUid, {
    email: testEmail,
    role: 'farmer',
    name: 'Cloudinary Live Tester',
    phone: '9876543299',
    verified: true,
    status: 'active',
    joinedDate: new Date().toISOString().split('T')[0],
    location: { district: 'Nashik', state: 'Maharashtra', villageOrCity: 'Niphad', pincode: '422303' },
    rating: 5,
  });

  // Client sign-in to obtain signed JWT ID token
  const clientAuth = getFirebaseClientAuth();
  assert.ok(clientAuth, 'Firebase Client Auth instance must be available');
  const creds = await signInWithEmailAndPassword(clientAuth, testEmail, testPassword);
  const idToken = await creds.user.getIdToken();
  assert.ok(idToken && idToken.length > 50, 'Must obtain a valid signed JWT ID token');
  console.log('✔ PASS: Real Firebase Auth user created and signed JWT ID token obtained.');

  // STEP 3: Server-Side Cryptographic Token Verification
  console.log('\nSTEP 3: Server verifying token and deriving authoritative user profile...');
  const authenticatedUser = await verifyTokenAndGetUser(idToken);
  assert.equal(authenticatedUser.uid, farmerUid, 'Derived UID must match authenticated farmer UID');
  assert.equal(authenticatedUser.role, 'farmer', 'Derived role must be farmer');
  console.log('✔ PASS: Server cryptographically verified ID token and derived authoritative farmer UID.');

  // STEP 4: Server Generates Deterministic Cloudinary Namespace & Upload Signature
  console.log('\nSTEP 4: Generating deterministic upload signature...');
  const signaturePayload = createUploadSignature(authenticatedUser, {
    targetType: 'product',
    contentType: 'image/png',
    fileSizeBytes: 68,
  });

  assert.ok(signaturePayload.signature && signaturePayload.signature.length === 40, 'Signature must be SHA-1 hex');
  assert.equal(signaturePayload.cloudName, cloudConfig.cloudName, 'Cloud name must match');
  assert.equal(signaturePayload.apiKey, cloudConfig.apiKey, 'API key must match');
  assert.equal(signaturePayload.folder, `gramora/products/${farmerUid}`, 'Folder must strictly isolate by sellerId');
  assert.ok(signaturePayload.uploadUrl.includes(cloudConfig.cloudName), 'Upload URL must point to Cloudinary API');
  console.log(`✔ PASS: Signature generated for namespace: ${signaturePayload.folder}`);

  // STEP 5: Perform Real Direct Controlled Cloudinary Upload
  console.log('\nSTEP 5: Uploading real test asset directly to Cloudinary...');
  // 1x1 transparent PNG buffer
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAElFTkSuQmCC';
  const pngBuffer = Buffer.from(pngBase64, 'base64');
  const blob = new Blob([pngBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', blob, 'test-asset.png');
  formData.append('api_key', signaturePayload.apiKey);
  formData.append('timestamp', signaturePayload.timestamp.toString());
  formData.append('signature', signaturePayload.signature);
  formData.append('folder', signaturePayload.folder);

  const uploadRes = await fetch(signaturePayload.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    console.error('Cloudinary upload failure response:', uploadData);
    throw new Error(`Cloudinary upload failed with status ${uploadRes.status}: ${JSON.stringify(uploadData)}`);
  }

  assert.ok(uploadData.secure_url, 'Cloudinary response must contain secure_url');
  assert.ok(uploadData.public_id, 'Cloudinary response must contain public_id');
  assert.ok(uploadData.secure_url.startsWith('https://res.cloudinary.com/'), 'URL must be Cloudinary secure CDN URL');
  assert.ok(
    uploadData.public_id.startsWith(`gramora/products/${farmerUid}/`),
    `Asset public_id (${uploadData.public_id}) must be in server-controlled folder (gramora/products/${farmerUid}/)`
  );
  assert.equal(uploadData.format, 'png', 'Asset format must be PNG');
  assert.equal(uploadData.bytes, 68, 'Uploaded asset size must match test payload size');
  console.log('✔ PASS: Direct Cloudinary upload succeeded!');
  console.log(`       - Public ID prefix verified: gramora/products/${farmerUid}/[hash]`);
  console.log(`       - Format: ${uploadData.format}, Bytes: ${uploadData.bytes}, Width: ${uploadData.width}, Height: ${uploadData.height}`);

  const testAssetPublicId = uploadData.public_id;
  const testAssetUrl = uploadData.secure_url;

  // STEP 6: Persist Image in Real Product Listing
  console.log('\nSTEP 6: Persisting Cloudinary asset metadata into Firestore product document...');
  const createdProduct = await productRepository.create({
    sellerId: farmerUid,
    sellerName: 'Cloudinary Live Tester',
    sellerType: 'farmer',
    sellerRating: 5,
    sellerVerified: true,
    title: 'Cloudinary Verification Produce',
    category: 'grains',
    variety: 'Sharbati',
    pricePerUnit: 45,
    pricePerUnitPaise: 4500,
    unit: 'kg',
    marketMandiPrice: 50,
    minOrderQuantity: 10,
    totalAvailableQuantity: 100,
    listingStatus: 'active',
    location: { district: 'Nashik', state: 'Maharashtra' },
    images: [testAssetUrl],
    harvestDate: '2026-03-20',
    shelfLifeDays: 90,
    qualityGrade: 'Grade A',
    storageType: 'Ambient Warehouse',
    description: 'Fresh crop batch verifying Cloudinary image persistence',
    organicCertified: true,
    tags: ['Wheat', 'Live-Verification'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const fetchedProduct = await productRepository.findById(createdProduct.id);
  assert.ok(fetchedProduct, 'Product must be retrievable from Firestore');
  assert.equal(fetchedProduct.images[0], testAssetUrl, 'Persisted image URL must match Cloudinary secure URL');
  console.log('✔ PASS: Product created in Firestore with real Cloudinary asset URL.');

  // STEP 7: AppImage / CDN URL Transformation
  console.log('\nSTEP 7: Verifying AppImage / Cloudinary CDN URL optimization...');
  const optimizedUrl = getOptimizedImageUrl(testAssetUrl, { width: 400, height: 400, quality: 'auto', format: 'auto' });
  assert.ok(optimizedUrl.includes('f_auto,q_auto,c_fill,w_400,h_400'), 'Optimized URL must include Cloudinary transformation flags');
  console.log('✔ PASS: AppImage optimization flags (f_auto,q_auto,c_fill) correctly applied to CDN URL.');

  // STEP 8: Security & Cross-Tenant Boundary Enforcement
  console.log('\nSTEP 8: Verifying RBAC and Cross-Tenant Upload Barriers...');
  const mockFarmerB: AuthenticatedUser = {
    uid: 'farmer-intruder-002',
    role: 'farmer',
    name: 'Intruder Farmer',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };
  const mockBuyer: AuthenticatedUser = {
    uid: 'buyer-003',
    role: 'buyer',
    name: 'Agri Buyer',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };
  const mockConsumer: AuthenticatedUser = {
    uid: 'consumer-004',
    role: 'consumer',
    name: 'Retail Consumer',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };
  const mockAdmin: AuthenticatedUser = {
    uid: 'admin-root-005',
    role: 'admin',
    name: 'Root Admin',
    verified: true,
    profileExists: true,
    status: 'active',
    claims: {},
  };

  // 8a: Farmer B cannot get signature for Farmer A's product
  assert.throws(
    () => createUploadSignature(mockFarmerB, { targetType: 'product' }, farmerUid),
    (err: any) => err.statusCode === 403,
    'Farmer B must be rejected with 403 when requesting upload for Farmer A product'
  );
  console.log('✔ PASS: Farmer B denied upload signature for Farmer A product (403 FORBIDDEN).');

  // 8b: Buyer cannot upload product images
  assert.throws(
    () => createUploadSignature(mockBuyer, { targetType: 'product' }),
    (err: any) => err.statusCode === 403,
    'Buyer must be rejected with 403 for product upload'
  );
  console.log('✔ PASS: Buyer denied product upload permission (403 FORBIDDEN).');

  // 8c: Consumer cannot upload product images
  assert.throws(
    () => createUploadSignature(mockConsumer, { targetType: 'product' }),
    (err: any) => err.statusCode === 403,
    'Consumer must be rejected with 403 for product upload'
  );
  console.log('✔ PASS: Consumer denied product upload permission (403 FORBIDDEN).');

  // 8d: Invalid MIME type
  assert.throws(
    () => createUploadSignature(authenticatedUser, { targetType: 'product', contentType: 'application/pdf' }),
    (err: any) => err.statusCode === 400,
    'PDF must be rejected with 400'
  );
  console.log('✔ PASS: Unsupported MIME type (application/pdf) rejected with 400.');

  // 8e: Oversized file
  assert.throws(
    () => createUploadSignature(authenticatedUser, { targetType: 'product', fileSizeBytes: 15 * 1024 * 1024 }),
    (err: any) => err.statusCode === 400,
    'Oversized file (>10MB) must be rejected with 400'
  );
  console.log('✔ PASS: Oversized file (>10MB) rejected with 400.');

  // 8f: Admin editing farmer's product keeps namespace tied to farmer
  const adminSig = createUploadSignature(mockAdmin, { targetType: 'product' }, farmerUid);
  assert.equal(adminSig.folder, `gramora/products/${farmerUid}`, 'Admin editing farmer product must keep folder bound to farmerUid');
  console.log('✔ PASS: Admin upload for seller binds namespace strictly to seller ID, not admin UID.');

  // STEP 9: Asset Ownership & Live Asset Deletion / Cleanup
  console.log('\nSTEP 9: Performing live Cloudinary asset destruction & cleanup...');
  // Verify Farmer B cannot delete Farmer A's asset
  assert.throws(
    () => assertAssetOwnership(mockFarmerB, testAssetPublicId),
    (err: any) => err.statusCode === 403,
    'Farmer B must be forbidden from deleting Farmer A asset'
  );
  console.log('✔ PASS: Cross-tenant asset deletion blocked with 403.');

  // Authorized owner destroys the live asset in Cloudinary
  const deleteOk = await destroyCloudinaryAsset(authenticatedUser, testAssetPublicId);
  assert.equal(deleteOk, true, 'Live Cloudinary destroy request must return ok: true');
  console.log('✔ PASS: Live Cloudinary test asset successfully destroyed and removed from CDN.');

  // STEP 10: Clean up database test artifacts
  console.log('\nSTEP 10: Cleaning up test artifacts from Firestore and Firebase Auth...');
  await productRepository.delete(createdProduct.id);
  await userRepository.delete(farmerUid);
  await adminAuth.deleteUser(farmerUid);
  console.log('✔ PASS: Temporary product, user profile, and Auth account cleanly deleted.');

  console.log('\n====================================================');
  console.log('ALL 10/10 REAL CLOUDINARY LIVE TESTS PASSED!');
  console.log('====================================================\n');
}

runLiveCloudinaryVerification().catch((err) => {
  console.error('\n❌ Cloudinary Live Verification Failed:', err);
  process.exit(1);
});
